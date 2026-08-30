import { NextResponse } from "next/server";

/**
 * POST /api/capability-token — issue a new capability token.
 *
 * Day 6 wires WebCrypto signing (with a node:crypto fallback) and enforces
 * token verification on every tool call. On Day 1 this route documents the
 * contract; the issuing logic lives in lib/capability.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Capability token issuance is wired on Day 6. The route contract is documented at GET /api.",
    },
    { status: 501 },
  );
}
