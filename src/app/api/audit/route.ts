import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { listAuditEntries } from "@/lib/audit";

/**
 * GET /api/audit — list the authenticated user's audit entries (newest first).
 *
 * Query params:
 *   - limit: max entries (default 50, max 1000)
 *
 * Returns the recent audit log — every agent tool call and every user
 * mutation is recorded here. The activity feed UI (next task) subscribes to
 * this via WebSocket for real-time updates; this HTTP endpoint is the
 * initial load + the polling fallback.
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 50;

  const entries = await listAuditEntries(auth.user.id, limit);

  return NextResponse.json({
    entries,
    count: entries.length,
  });
}

export const dynamic = "force-dynamic";
