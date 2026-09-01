import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { queryFacts, listFacts } from "@/lib/memory";
import { appendAuditEntry } from "@/lib/audit";

/**
 * POST /api/memory/query — query the user's facts.
 *
 * Body: { query: string, tags?: string[], limit?: number }
 *
 * Two-stage search:
 *   1. Substring + tag match (fast, deterministic) — the query string is
 *      matched against BOTH fact content AND tags (OR condition). Querying
 *      "preferences" finds facts tagged #preferences even if the word isn't
 *      in the content.
 *   2. Recent-facts fallback — if stage 1 returns 0, returns the user's
 *      most recent facts with a note so the result is never jarringly empty.
 *
 * Response includes metadata:
 *   - fallback: boolean (true if results are recent facts, not search matches)
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

  const query = body.query ?? "";
  const trimmedQuery = query.trim();

  // Stage 1: substring + tag match.
  const facts = await queryFacts(auth.user.id, {
    query: trimmedQuery,
    tags: body.tags,
    limit: body.limit,
  });

  // Stage 2: recent-facts fallback (never return empty).
  let fallback = false;
  let note: string | undefined;
  let resultFacts = facts;

  if (facts.length === 0 && trimmedQuery) {
    const recent = await listFacts(auth.user.id, { limit: body.limit ?? 5 });
    resultFacts = recent;
    fallback = true;
    note = recent.length > 0
      ? `No facts match "${trimmedQuery}". Showing your ${recent.length} most recent ${recent.length === 1 ? "fact" : "facts"}.`
      : `No facts match "${trimmedQuery}". Your memory vault is empty.`;
  }

  // Append the audit entry — this is the read-path provenance record.
  await appendAuditEntry({
    userId: auth.user.id,
    callerOrigin: "recall.app",
    toolName: "query",
    args: { query: body.query, tags: body.tags, fallback },
    result: { count: resultFacts.length },
    resultCount: resultFacts.length,
  });

  return NextResponse.json({
    facts: resultFacts,
    count: resultFacts.length,
    fallback,
    note,
  });
}

export const dynamic = "force-dynamic";
