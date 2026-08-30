import { NextResponse } from "next/server";

/**
 * GET /api/memory — list the authenticated user's facts (paginated).
 *
 * Day 3 wires the full CRUD: list, create, get-one, update, soft-delete, plus
 * the query and summarize WebMCP tool handlers. On Day 1 this route exists to
 * document the contract and to keep the API manifest honest — it returns 501
 * until the MemoryStore access layer lands.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Memory CRUD is wired on Day 3. The route contract is documented at GET /api.",
    },
    { status: 501 },
  );
}

/**
 * POST /api/memory — create a fact (user-initiated).
 *
 * Day 3 implementation: writes a Fact row (source: "user", sourceOrigin:
 * "<site origin>"), normalizes tags into FactTag rows, and appends an audit
 * entry. The agent-initiated path uses the addFact WebMCP tool, which lands on
 * Day 4/5 and shares this access layer.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message:
        "Fact creation is wired on Day 3. The route contract is documented at GET /api.",
    },
    { status: 501 },
  );
}
