/**
 * Recall — capability token helpers.
 *
 * A capability token is the credential an agent (ChatGPT) presents to call a
 * Recall tool. It is short-TTL (60-300s), audience-restricted (scoped to
 * chatgpt.com or a user-granted origin), and scope-limited (a subset of the
 * six ENABLED tools). It is signed with the user's site key (WebCrypto) so a
 * token is verifiable independent of the database.
 *
 * The capability token is the credential; the audit log is
 * the receipt."
 *
 * The token's scope is ALWAYS intersected with the user's currently-enabled
 * tools. If the user disables a tool after a token is issued, the token can
 * no longer call that tool — the verify check re-reads the permission state.
 */
import { db } from "@/lib/db";
import {
  CAPABILITY_TOKEN_DEFAULT_TTL_SECONDS,
  type ToolName,
} from "@/lib/constants";
import { CHATGPT_AUDIENCE } from "@/lib/constants";
import { getPermissionState } from "@/lib/permissions";
import { signWithSiteKey } from "@/lib/security/site-key";
import type { InArgs } from "@libsql/client";

/** A verified capability token — the principal a tool call runs as. */
export interface VerifiedCapability {
  userId: string;
  audience: string;
  scope: ToolName[];
  capabilityTokenId: string;
  expiresAt: Date;
}

/** A token as returned to the client (no secrets beyond the id + signature). */
export interface IssuedToken {
  id: string;
  audience: string;
  scope: ToolName[];
  expiresAt: string;
  signature: string;
}

export interface IssueCapabilityOptions {
  userId: string;
  /** Defaults to the ChatGPT in-app browser origin. */
  audience?: string;
  /** Defaults to all enabled tools. */
  scope?: ToolName[];
  /** TTL in seconds; clamped to [60, 300]. */
  ttlSeconds?: number;
}

/**
 * Issue a new capability token for an agent session.
 *
 * The token's scope is intersected with the user's currently-enabled tools,
 * so a disabled tool can never be called even if the agent requests it.
 * The token is signed with the user's site key (WebCrypto ECDSA P-256) so
 * it is verifiable independent of the database.
 */
export async function issueCapability(
  opts: IssueCapabilityOptions,
): Promise<IssuedToken> {
  const ttl = clampTtl(opts.ttlSeconds ?? CAPABILITY_TOKEN_DEFAULT_TTL_SECONDS);
  const audience = opts.audience ?? CHATGPT_AUDIENCE;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const expiresAtIso = expiresAt.toISOString();
  const expiresAtDb = expiresAtIso.replace("T", " ").replace("Z", "");
  const id = crypto.randomUUID();

  // Intersect the requested scope with the user's enabled tools.
  const permState = await getPermissionState(opts.userId);
  const requestedScope = opts.scope ?? permState.enabledTools;
  const scope = requestedScope.filter((t) => permState.enabledTools.includes(t));

  // Persist the token row.
  await db.execute({
    sql: `INSERT INTO CapabilityToken (id, userId, audience, scopeJson, issuedAt, expiresAt) VALUES (?, ?, ?, ?, datetime('now'), ?)`,
    args: [id, opts.userId, audience, JSON.stringify(scope), expiresAtDb] as InArgs,
  });

  // Sign the token payload with the user's site key.
  const payload = {
    id,
    userId: opts.userId,
    audience,
    scope,
    expiresAt: expiresAtIso,
  };
  const signature = await signWithSiteKey(opts.userId, payload);

  return {
    id,
    audience,
    scope,
    expiresAt: expiresAtIso,
    signature,
  };
}

/**
 * Verify a capability token for a given tool call.
 *
 * Checks: existence, revocation, expiry, audience match, scope membership,
 * AND that the tool is currently ENABLED in the user's permission state
 * (re-read from the database so a post-issuance disable takes effect).
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
  const row = result.rows[0] as unknown as {
    id: string;
    userId: string;
    audience: string;
    scopeJson: string;
    expiresAt: string;
    revokedAt: string | null;
  };
  if (row.revokedAt) return null;

  const expiresAt = new Date(row.expiresAt.replace(" ", "T") + "Z");
  if (expiresAt.getTime() < Date.now()) return null;

  if (expectedAudience && row.audience !== expectedAudience) return null;

  const scope = JSON.parse(row.scopeJson ?? "[]") as ToolName[];
  if (scope.length > 0 && !scope.includes(toolName)) return null;

  // Re-check the user's current permission state — a post-issuance disable
  // must take effect immediately.
  const permState = await getPermissionState(row.userId);
  if (!permState.enabledTools.includes(toolName)) return null;

  return {
    userId: row.userId,
    audience: row.audience,
    scope,
    capabilityTokenId: row.id,
    expiresAt,
  };
}

/** Revoke a capability token (used when the user disables a tool). */
export async function revokeCapability(tokenId: string): Promise<void> {
  await db.execute({
    sql: `UPDATE CapabilityToken SET revokedAt = datetime('now') WHERE id = ?`,
    args: [tokenId] as InArgs,
  });
}

/** List active (non-expired, non-revoked) tokens for a user. */
export async function listActiveTokens(
  userId: string,
): Promise<
  {
    id: string;
    audience: string;
    scope: ToolName[];
    issuedAt: Date;
    expiresAt: Date;
  }[]
> {
  const result = await db.execute({
    sql: `SELECT id, audience, scopeJson, issuedAt, expiresAt FROM CapabilityToken WHERE userId = ? AND revokedAt IS NULL AND expiresAt > datetime('now') ORDER BY issuedAt DESC`,
    args: [userId] as InArgs,
  });

  return result.rows.map((row) => {
    const r = row as unknown as {
      id: string;
      audience: string;
      scopeJson: string;
      issuedAt: string;
      expiresAt: string;
    };
    return {
      id: r.id,
      audience: r.audience,
      scope: JSON.parse(r.scopeJson ?? "[]") as ToolName[],
      issuedAt: new Date(r.issuedAt.replace(" ", "T") + "Z"),
      expiresAt: new Date(r.expiresAt.replace(" ", "T") + "Z"),
    };
  });
}

function clampTtl(seconds: number): number {
  return Math.max(60, Math.min(300, seconds));
}
