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
  // Canonical JSON with sorted top-level keys so the hash is stable regardless
  // of the order the tool handler assembled the result object in.
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
}) {
  const hash = computeResultHash(input.result);
  const entry = await db.auditEntry.create({
    data: {
      userId: input.userId,
      callerOrigin: input.callerOrigin,
      toolName: input.toolName,
      argsJson: JSON.stringify(input.args),
      resultCount: input.resultCount,
      resultHash: hash,
      capabilityTokenId: input.capabilityTokenId ?? null,
      signature: input.signature ?? "unsigned",
    },
  });
  return entry;
}

/**
 * List recent audit entries for a user (newest first).
 * Used by the activity feed (Day 5) and the audit export (Day 7).
 */
export async function listAuditEntries(
  userId: string,
  limit = 50,
): Promise<AuditEntryView[]> {
  const rows = await db.auditEntry.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: Math.min(limit, 1000),
  });
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.getTime(),
    callerOrigin: r.callerOrigin,
    toolName: r.toolName as ToolName,
    args: JSON.parse(r.argsJson) as SanitizedArgs,
    resultCount: r.resultCount,
    resultHash: r.resultHash,
    capabilityTokenId: r.capabilityTokenId,
    signature: r.signature,
  }));
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
