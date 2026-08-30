import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { queryFacts } from "@/lib/memory";
import { appendAuditEntry } from "@/lib/audit";

/**
 * POST /api/memory/query — query the user's facts.
 *
 * Body: { query: string, tags?: string[], limit?: number }
 *
 * This is the endpoint the WebMCP `query` tool handler will call (next task).
 * It's also exposed here so the /app canvas can power its search box.
 *
 * Deterministic: substring match on content + tag match, sorted by relevance
 * score (blueprint §23.3).
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { query?: string; tags?: string[]; limit?: number };
  try {
    body = (await request.json()) as { query?: string; tags?: string[]; limit?: number };
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const facts = await queryFacts(auth.user.id, {
    query: body.query ?? "",
    tags: body.tags,
    limit: body.limit,
  });

  // Append the audit entry — this is the read-path provenance record.
  await appendAuditEntry({
    userId: auth.user.id,
    callerOrigin: "recall.app",
    toolName: "query",
    args: { query: body.query, tags: body.tags },
    result: { count: facts.length },
    resultCount: facts.length,
  });

  return NextResponse.json({ facts, count: facts.length });
}

export const dynamic = "force-dynamic";
