import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { semanticQueryFacts } from "@/lib/memory/semantic";
import { appendAuditEntry } from "@/lib/audit";

/**
 * POST /api/memory/query — semantic query of the user's facts.
 *
 * Body: { query: string, tags?: string[], limit?: number }
 *
 * Three-stage search pipeline:
 *   1. Substring + tag match (fast, deterministic)
 *   2. LLM query expansion (if stage 1 returns 0 — e.g. "hobbies" finds
 *      "I like rock climbing" because the LLM knows climbing is a hobby)
 *   3. Recent-facts fallback (if stages 1+2 return 0 — never return empty)
 *
 * Response includes metadata about which stage produced the results:
 *   - expanded: boolean (was LLM expansion used?)
 *   - expandedTerms: string[] (the terms searched, if expanded)
 *   - fallback: boolean (are these recent facts, not search matches?)
 *   - note: string (human-readable explanation)
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

  const result = await semanticQueryFacts(auth.user.id, {
    query: body.query ?? "",
    tags: body.tags,
    limit: body.limit,
  });

  // Append the audit entry — this is the read-path provenance record.
  await appendAuditEntry({
    userId: auth.user.id,
    callerOrigin: "recall.app",
    toolName: "query",
    args: {
      query: body.query,
      tags: body.tags,
      expanded: result.expanded,
      fallback: result.fallback,
    },
    result: { count: result.count },
    resultCount: result.count,
  });

  return NextResponse.json({
    facts: result.facts,
    count: result.count,
    expanded: result.expanded,
    expandedTerms: result.expandedTerms,
    fallback: result.fallback,
    note: result.note,
  });
}

export const dynamic = "force-dynamic";
