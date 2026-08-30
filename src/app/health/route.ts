import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { APP_VERSION, SERVICE_NAME } from "@/lib/constants";

/**
 * GET /health — Recall's health-check endpoint.
 *
 * Used by:
 *   - Vercel's deployment checks
 *   - the CI smoke test
 *   - uptime monitoring (blueprint §29.7)
 *
 * Returns 200 with a status envelope when the app and database are reachable.
 * Returns 503 when the database is unreachable so the deployment is not marked
 * healthy on a degraded datastore.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    // A trivial query — fails fast if the database is unreachable.
    await db.user.count({ take: 1 });
    return NextResponse.json(
      {
        status: "ok",
        service: SERVICE_NAME,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        uptimeMs: Date.now() - startedAt,
        database: "connected",
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
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    );
  }
}
