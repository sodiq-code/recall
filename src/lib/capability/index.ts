/**
 * Recall — capability token helpers (foundation; fully wired on Day 6).
 *
 * A capability token is the credential an agent (ChatGPT) presents to call a
 * Recall tool. It is short-TTL (60-300s), audience-restricted (scoped to
 * chatgpt.com or a user-granted origin), and scope-limited (a subset of the
 * six tools). It is signed with the user's site key (WebCrypto) so a token is
 * verifiable independent of the database.
 *
 * Blueprint §17: "the capability token is the credential; the audit log is
 * the receipt."
 *
 * On Day 1 this module establishes the issue/verify contract. Day 6 wires
 * WebCrypto `subtle.sign` (with a node:crypto fallback) and enforces token
 * verification on every tool call.
 */
import { db } from "@/lib/db";
import {
  CAPABILITY_TOKEN_DEFAULT_TTL_SECONDS,
  type ToolName,
} from "@/lib/constants";
import { CHATGPT_AUDIENCE } from "@/lib/constants";

/** A verified capability token — the principal a tool call runs as. */
export interface VerifiedCapability {
  userId: string;
  audience: string;
  scope: ToolName[];
  capabilityTokenId: string;
  expiresAt: Date;
}

export interface IssueCapabilityOptions {
  userId: string;
  /** Defaults to the ChatGPT in-app browser origin. */
  audience?: string;
  /** Defaults to all six tools. */
  scope?: ToolName[];
  /** TTL in seconds; clamped to [60, 300]. */
  ttlSeconds?: number;
}

/**
 * Issue a new capability token for an agent session.
 *
 * Day 6 attaches the WebCrypto signature and writes the public key id. The
 * database row is the revocation handle — deleting it revokes the token.
 */
export async function issueCapability(
  opts: IssueCapabilityOptions,
): Promise<{ id: string; audience: string; scope: ToolName[]; expiresAt: Date }> {
  const ttl = clampTtl(opts.ttlSeconds ?? CAPABILITY_TOKEN_DEFAULT_TTL_SECONDS);
  const audience = opts.audience ?? CHATGPT_AUDIENCE;
  const scope = opts.scope ?? [];
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const expiresAtIso = expiresAt.toISOString().replace("T", " ").replace("Z", "");
  const id = crypto.randomUUID();

  await db.execute({
    sql: `INSERT INTO CapabilityToken (id, userId, audience, scopeJson, issuedAt, expiresAt) VALUES (?, ?, ?, ?, datetime('now'), ?)`,
    args: [id, opts.userId, audience, JSON.stringify(scope), expiresAtIso],
  });

  return { id, audience, scope, expiresAt };
}

/**
 * Verify a capability token for a given tool call.
 *
 * Day 6 adds signature verification. Day 1 checks existence, expiry, scope,
 * and revocation — enough of the contract for the scaffold to typecheck.
 */
export async function verifyCapability(
  tokenId: string,
  toolName: ToolName,
  expectedAudience?: string,
): Promise<VerifiedCapability | null> {
  const result = await db.execute({
    sql: `SELECT id, userId, audience, scopeJson, expiresAt, revokedAt FROM CapabilityToken WHERE id = ?`,
    args: [tokenId],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0] as Record<string, unknown>;
  if (row.revokedAt) return null;

  const expiresAtStr = row.expiresAt as string;
  const expiresAt = new Date(expiresAtStr.replace(" ", "T") + "Z");
  if (expiresAt.getTime() < Date.now()) return null;

  const audience = row.audience as string;
  if (expectedAudience && audience !== expectedAudience) return null;

  const scope = JSON.parse((row.scopeJson as string) ?? "[]") as ToolName[];
  if (scope.length > 0 && !scope.includes(toolName)) return null;

  return {
    userId: row.userId as string,
    audience,
    scope,
    capabilityTokenId: row.id as string,
    expiresAt,
  };
}

/** Revoke a capability token (used when the user disables a tool). */
export async function revokeCapability(tokenId: string): Promise<void> {
  await db.execute({
    sql: `UPDATE CapabilityToken SET revokedAt = datetime('now') WHERE id = ?`,
    args: [tokenId],
  });
}

function clampTtl(seconds: number): number {
  return Math.max(60, Math.min(300, seconds));
}
