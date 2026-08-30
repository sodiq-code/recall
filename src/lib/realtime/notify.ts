/**
 * Recall — realtime notification helper.
 *
 * The bridge between the Next.js backend and the realtime WebSocket
 * mini-service. When a WebMCP tool call (or a user mutation) appends an audit
 * entry, the API route calls `notifyAuditEvent()` to broadcast it to all of
 * the user's open Recall tabs via the mini-service.
 *
 * Flow (blueprint §22.5, §32 Day 5):
 *   1. The tool handler appends an audit entry to Turso (lib/audit)
 *   2. The tool handler calls notifyAuditEvent(userId, entry)
 *   3. This helper POSTs to the realtime mini-service's /emit endpoint
 *   4. The mini-service broadcasts the entry to every socket in user:<userId>
 *   5. The ActivityFeed component receives the event and prepends the entry
 *
 * The /emit endpoint is authenticated with a shared secret (REALTIME_SECRET)
 * so only the Next.js backend can emit. The helper is fire-and-forget: if the
 * mini-service is unreachable, the audit entry is still persisted in Turso
 * (the feed will pick it up on the next poll/refetch). This is the blueprint
 * fallback: "poll /api/audit every 2s if WebSocket fails."
 */

const REALTIME_PORT = process.env.REALTIME_PORT ?? "3003";
const REALTIME_SECRET = process.env.REALTIME_SECRET ?? "recall-realtime-dev";

interface AuditEventEntry {
  id: string;
  timestamp: number;
  callerOrigin: string;
  toolName: string;
  args: Record<string, unknown>;
  resultCount: number;
  resultHash: string;
  capabilityTokenId: string | null;
  signature: string;
}

/**
 * Notify the realtime mini-service of a new audit entry.
 *
 * Fire-and-forget: errors are logged but never thrown, so a transient
 * mini-service outage doesn't break the API route. The audit entry is
 * already persisted in Turso before this is called.
 */
export async function notifyAuditEvent(
  userId: string,
  entry: AuditEventEntry,
): Promise<void> {
  try {
    const url = `http://localhost:${REALTIME_PORT}/emit`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REALTIME_SECRET}`,
      },
      body: JSON.stringify({ userId, entry }),
      // Don't wait too long — the feed will poll as a fallback.
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    // Fire-and-forget: log but don't throw.
    console.warn(
      "[recall] realtime notify failed (audit entry is still persisted):",
      err instanceof Error ? err.message : err,
    );
  }
}
