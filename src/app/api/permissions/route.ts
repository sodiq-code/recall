import { NextResponse } from "next/server";

/**
 * GET /api/permissions — get the user's per-tool permission state.
 *
 * Day 6 wires the per-tool enable/disable controls and the granted-origins
 * management UI at /app/settings. On Day 1 this route documents the contract.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Permission management is wired on Day 6. The route contract is documented at GET /api.",
    },
    { status: 501 },
  );
}

/** PATCH /api/permissions — update tool enablement / granted origins. */
export async function PATCH() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Permission management is wired on Day 6. The route contract is documented at GET /api.",
    },
    { status: 501 },
  );
}
