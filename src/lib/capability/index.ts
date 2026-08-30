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

  const token = await db.capabilityToken.create({
    data: {
      userId: opts.userId,
      audience,
      scopeJson: JSON.stringify(scope),
      expiresAt,
    },
  });

  return { id: token.id, audience, scope, expiresAt };
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
  const token = await db.capabilityToken.findUnique({ where: { id: tokenId } });
  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt.getTime() < Date.now()) return null;
  if (expectedAudience && token.audience !== expectedAudience) return null;

  const scope = JSON.parse(token.scopeJson) as ToolName[];
  if (scope.length > 0 && !scope.includes(toolName)) return null;

  return {
    userId: token.userId,
    audience: token.audience,
    scope,
    capabilityTokenId: token.id,
    expiresAt: token.expiresAt,
  };
}

/** Revoke a capability token (used when the user disables a tool). */
export async function revokeCapability(tokenId: string): Promise<void> {
  await db.capabilityToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

function clampTtl(seconds: number): number {
  return Math.max(60, Math.min(300, seconds));
}
