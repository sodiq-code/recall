/**
 * Recall — audit log helpers .
 *
 * Every agent tool call appends one immutable, signed entry to the audit log.
 * The audit log is Recall's observability layer : it is the
 * receipt the user checks ChatGPT's claims against, and the exportable
 * artifact signed with the site key .
 *
 * This module establishes the append/list contract and the
 * result-hash computation. 
 * fan-out layer on top of this contract.
 */
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { ToolName } from "@/lib/constants";
import { notifyAuditEvent } from "@/lib/realtime/notify";

/** The compact provenance summary stored alongside each entry. */
export interface AuditResultSummary {
  count: number;
  hash: string;
}

/** The sanitized args stored with an entry (private content stripped). */
export type SanitizedArgs = Record<string, unknown>;

/**
 * Compute the verification hash for a tool call result.
 *
 * The hash is a SHA-256 of the canonical JSON of the full result, so the
 * stored summary lets a user (or a judge) verify that a given result matches
 * what the audit log claims — without the audit log having to store the full
 * result body.
 */
export function computeResultHash(result: unknown): string {
  const value =
    result && typeof result === "object" && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : { value: result };
  const sortedKeys = Object.keys(value).sort();
  const canonical = sortedKeys.map((k) => [k, value[k]] as const);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Append an audit entry for a tool call.
 *
 * The WebSocket fan-out is wired (broadcast to all open Recall tabs).
 * Capability token id and detached JWS signature are attached.
 */
export async function appendAuditEntry(input: {
  userId: string;
  callerOrigin: string;
  toolName: ToolName;
  args: SanitizedArgs;
  result: unknown;
  resultCount: number;
  capabilityTokenId?: string;
  signature?: string;
}): Promise<{ id: string; resultHash: string; timestamp: number }> {
  const hash = computeResultHash(input.result);
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  const timestampIso = new Date(timestamp).toISOString().replace("T", " ").replace("Z", "");
  await db.execute({
    sql: `INSERT INTO AuditEntry (id, userId, timestamp, callerOrigin, toolName, argsJson, resultCount, resultHash, capabilityTokenId, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.userId,
      timestampIso,
      input.callerOrigin,
      input.toolName,
      JSON.stringify(input.args),
      input.resultCount,
      hash,
      input.capabilityTokenId ?? null,
      input.signature ?? "unsigned",
    ],
  });

  // Fan out to the realtime mini-service so all open Recall tabs update
  // their activity feed in real time. Fire-and-forget — the entry is already
  // persisted, so a mini-service outage doesn't lose data.
  await notifyAuditEvent(input.userId, {
    id,
    timestamp,
    callerOrigin: input.callerOrigin,
    toolName: input.toolName,
    args: input.args,
    resultCount: input.resultCount,
    resultHash: hash,
    capabilityTokenId: input.capabilityTokenId ?? null,
    signature: input.signature ?? "unsigned",
  });

  return { id, resultHash: hash, timestamp };
}

/**
 * List recent audit entries for a user (newest first).
 * Used by the activity feed and the audit export.
 */
export async function listAuditEntries(
  userId: string,
  limit = 50,
): Promise<AuditEntryView[]> {
  const result = await db.execute({
    sql: `SELECT id, timestamp, callerOrigin, toolName, argsJson, resultCount, resultHash, capabilityTokenId, signature FROM AuditEntry WHERE userId = ? ORDER BY timestamp DESC LIMIT ?`,
    args: [userId, Math.min(limit, 1000)],
  });

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const ts = r.timestamp;
    const tsDate =
      ts instanceof Date
        ? ts
        : new Date(typeof ts === "string" ? ts.replace(" ", "T") + "Z" : Date.now());
    return {
      id: r.id as string,
      timestamp: tsDate.getTime(),
      callerOrigin: r.callerOrigin as string,
      toolName: r.toolName as ToolName,
      args: JSON.parse((r.argsJson as string) ?? "{}") as SanitizedArgs,
      resultCount: r.resultCount as number,
      resultHash: r.resultHash as string,
      capabilityTokenId: (r.capabilityTokenId as string | null) ?? null,
      signature: r.signature as string,
    };
  });
}

export interface AuditEntryView {
  id: string;
  timestamp: number;
  callerOrigin: string;
  toolName: ToolName;
  args: SanitizedArgs;
  resultCount: number;
  resultHash: string;
  capabilityTokenId: string | null;
  signature: string;
}

// ---------------------------------------------------------------------------
// Export — signed JWS bundle 
// ---------------------------------------------------------------------------

import { signWithSiteKey } from "@/lib/security/site-key";

export interface AuditExportBundle {
  /** ISO timestamp of the export. */
  exportedAt: string;
  /** The user's id (so the bundle is self-identifying). */
  userId: string;
  /** All audit entries, newest first. */
  entries: AuditEntryView[];
  /** Entry count (convenience for verifiers). */
  count: number;
}

export interface SignedAuditExport {
  /** The JWS payload (the audit export bundle, base64url-encoded). */
  payload: string;
  /** The detached JWS signature (base64url, ECDSA P-256 + SHA-256). */
  signature: string;
  /** The user's public key as a JWK, so the signature can be verified
   *  independently of the database. */
  publicKeyJwk: JsonWebKey | null;
  /** The signing algorithm. */
  alg: string;
}

/**
 * Export the user's full audit log as a signed JWS bundle.
 *
 * The audit export signs the bundle; users verify the JWS signature
 * with site's public key." The bundle is the payload; the signature is the
 * detached JWS so a judge (or the user, or an external auditor) can verify
 * the bundle hasn't been tampered with — independent of the database.
 */
export async function exportAuditLog(
  userId: string,
): Promise<SignedAuditExport> {
  // Fetch ALL entries (capped at 10,000 for practicality).
  const entries = await listAuditEntries(userId, 10000);

  const bundle: AuditExportBundle = {
    exportedAt: new Date().toISOString(),
    userId,
    entries,
    count: entries.length,
  };

  const payloadJson = JSON.stringify(bundle);
  const signature = await signWithSiteKey(userId, bundle);

  // Fetch the public key JWK so the signature can be verified externally.
  const publicKeyJwk = await getPublicKeyJwk(userId);

  return {
    payload: Buffer.from(payloadJson, "utf-8").toString("base64url"),
    signature,
    publicKeyJwk,
    alg: "ECDSA",
  };
}

/**
 * Fetch the user's public key as a JWK (for external signature verification).
 * Returns null if the user hasn't generated a site key yet.
 */
async function getPublicKeyJwk(
  userId: string,
): Promise<JsonWebKey | null> {
  const result = await db.execute({
    sql: `SELECT siteKeyJwk FROM "User" WHERE id = ?`,
    args: [userId],
  });
  const row = result.rows[0] as unknown as { siteKeyJwk: string | null } | undefined;
  if (!row?.siteKeyJwk) return null;

  const jwk = JSON.parse(row.siteKeyJwk) as JsonWebKey;
  // Return only the public components (strip private key ops).
  return {
    ...jwk,
    key_ops: ["verify"],
    // Ensure d (private exponent) is not included.
    d: undefined,
  };
}

