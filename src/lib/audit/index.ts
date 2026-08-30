/**
 * Recall — audit log helpers (foundation; fully wired on Day 5).
 *
 * Every agent tool call appends one immutable, signed entry to the audit log.
 * The audit log is Recall's observability layer (blueprint §29.8): it is the
 * receipt the user checks ChatGPT's claims against, and the exportable
 * artifact signed with the site key (Day 7).
 *
 * On Day 1 this module establishes the append/list contract and the
 * result-hash computation. The signing step (Day 6/7) and the WebSocket
 * fan-out (Day 5) layer on top of this contract.
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
 * Day 5 wires the WebSocket fan-out (broadcast to all open Recall tabs).
 * Day 6 attaches the capability token id and the detached JWS signature.
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
 * Used by the activity feed (Day 5) and the audit export (Day 7).
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
