import { NextResponse } from "next/server";

/**
 * GET /api/audit — list the authenticated user's audit entries (newest first).
 *
 * Day 5 wires the activity feed + WebSocket fan-out. Day 7 adds the signed
 * export at /api/audit/export. On Day 1 this route documents the contract.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "The audit feed is wired on Day 5 (activity feed) and Day 7 (signed export). The route contract is documented at GET /api.",
    },
    { status: 501 },
  );
}
