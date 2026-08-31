import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { summarizeFacts } from "@/lib/memory";
import { appendAuditEntry } from "@/lib/audit";

/**
 * POST /api/memory/summarize — return a deterministic top-N summary.
 *
 * Body: { tags?: string[], limit?: number }
 *
 * Returns the top N facts ranked by relevance score . The
 * LLM (ChatGPT) does the prose synthesis — Recall only returns the ranked
 * facts, so there is no LLM cost on Recall's side.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { tags?: string[]; limit?: number };
  try {
    body = (await request.json()) as { tags?: string[]; limit?: number };
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const facts = await summarizeFacts(
    auth.user.id,
    body.tags,
    body.limit,
  );

  await appendAuditEntry({
    userId: auth.user.id,
    callerOrigin: "recall.app",
    toolName: "summarize",
    args: { tags: body.tags, limit: body.limit },
    result: { count: facts.length },
    resultCount: facts.length,
  });

  return NextResponse.json({
    facts,
    count: facts.length,
    ranking: "relevanceScore (frequency-based)",
  });
}

export const dynamic = "force-dynamic";
