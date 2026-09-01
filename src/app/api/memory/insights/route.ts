import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { db } from "@/lib/db";
import type { ToolName } from "@/lib/constants";

/**
 * GET /api/memory/insights — aggregate stats about the user's memory vault.
 *
 * Returns a dashboard payload for the Memory Insights panel:
 *   - totalFacts: count of active (non-deleted) facts
 *   - bySource: { user, agent } counts
 *   - topTags: [{ tag, count }] — top 8 tags
 *   - activityLast7Days: [{ date, count }] — facts created per day for 7 days
 *   - toolCalls: [{ toolName, count }] — audit entries grouped by tool
 *   - lastActivityAt: timestamp of the most recent audit entry (or null)
 *
 * All queries are scoped to the authenticated user.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  // Total facts (active)
  const totalRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM Fact WHERE userId = ? AND deletedAt IS NULL`,
    args: [userId],
  });
  const totalFacts = Number((totalRes.rows[0] as unknown as { c: number | bigint }).c);

  // By source
  const sourceRes = await db.execute({
    sql: `SELECT source, COUNT(*) as c FROM Fact WHERE userId = ? AND deletedAt IS NULL GROUP BY source`,
    args: [userId],
  });
  const bySource = { user: 0, agent: 0 };
  for (const row of sourceRes.rows) {
    const r = row as unknown as { source: string; c: number | bigint };
    if (r.source === "user") bySource.user = Number(r.c);
    if (r.source === "agent") bySource.agent = Number(r.c);
  }

  // Top tags (across active facts)
  const tagsRes = await db.execute({
    sql: `SELECT t.tag, COUNT(*) as c
          FROM FactTag t
          JOIN Fact f ON f.id = t.factId
          WHERE f.userId = ? AND f.deletedAt IS NULL
          GROUP BY t.tag
          ORDER BY c DESC, t.tag ASC
          LIMIT 8`,
    args: [userId],
  });
  const topTags = tagsRes.rows.map((row) => {
    const r = row as unknown as { tag: string; c: number | bigint };
    return { tag: r.tag, count: Number(r.c) };
  });

  // Activity over the last 7 days (fact creation count per day)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
  const activityRes = await db.execute({
    sql: `SELECT date(createdAt) as d, COUNT(*) as c
          FROM Fact
          WHERE userId = ? AND deletedAt IS NULL AND createdAt >= ?
          GROUP BY date(createdAt)
          ORDER BY d ASC`,
    args: [userId, sevenDaysAgo],
  });
  // Build a full 7-day series (fill missing days with 0).
  const activityByDay = new Map<string, number>();
  for (const row of activityRes.rows) {
    const r = row as unknown as { d: string; c: number | bigint };
    activityByDay.set(r.d, Number(r.c));
  }
  const activityLast7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    activityLast7Days.push({
      date: iso,
      count: activityByDay.get(iso) ?? 0,
    });
  }

  // Tool calls (audit entries grouped by tool)
  const toolRes = await db.execute({
    sql: `SELECT toolName, COUNT(*) as c
          FROM AuditEntry
          WHERE userId = ?
          GROUP BY toolName
          ORDER BY c DESC`,
    args: [userId],
  });
  const toolCalls = toolRes.rows.map((row) => {
    const r = row as unknown as { toolName: ToolName; c: number | bigint };
    return { toolName: r.toolName, count: Number(r.c) };
  });

  // Last activity timestamp
  const lastRes = await db.execute({
    sql: `SELECT timestamp FROM AuditEntry WHERE userId = ? ORDER BY timestamp DESC LIMIT 1`,
    args: [userId],
  });
  let lastActivityAt: number | null = null;
  if (lastRes.rows.length > 0) {
    const ts = (lastRes.rows[0] as unknown as { timestamp: string | Date }).timestamp;
    const tsStr = ts instanceof Date ? ts.toISOString() : String(ts).replace(" ", "T") + "Z";
    lastActivityAt = new Date(tsStr).getTime();
  }

  return NextResponse.json({
    totalFacts,
    bySource,
    topTags,
    activityLast7Days,
    toolCalls,
    lastActivityAt,
  });
}

export const dynamic = "force-dynamic";
