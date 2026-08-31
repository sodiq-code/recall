import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { APP_VERSION, SERVICE_NAME } from "@/lib/constants";

/**
 * GET /health — Recall's health-check endpoint.
 *
 * Used by:
 *   - Vercel's deployment checks
 *   - the CI smoke test
 *   - uptime monitoring 
 *
 * Returns 200 with a status envelope when the app and database are reachable.
 * Returns 503 when the database is unreachable so the deployment is not marked
 * healthy on a degraded datastore.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    // A trivial query — fails fast if the database is unreachable.
    const result = await db.execute("SELECT COUNT(*) as c FROM User LIMIT 1");
    const count = (result.rows[0] as unknown as { c: number | bigint })?.c;
    return NextResponse.json(
      {
        status: "ok",
        service: SERVICE_NAME,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        uptimeMs: Date.now() - startedAt,
        database: "connected",
        userCount: typeof count === "bigint" ? Number(count) : count,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        service: SERVICE_NAME,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        database: "unreachable",
        error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
      },
      { status: 503 },
    );
  }
}
