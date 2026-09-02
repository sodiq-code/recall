import { NextResponse } from "next/server";
import { requireUser, requireToolEnabled } from "@/lib/auth/api";
import {
  createFact,
  listFacts,
  countFacts,
  FactValidationError,
} from "@/lib/memory";
import { appendAuditEntry } from "@/lib/audit";

/**
 * GET /api/memory — list the authenticated user's facts.
 *
 * Query params:
 *   - tag: filter by tag (exact match)
 *   - limit: max facts (default 50, max 200)
 *   - offset: pagination offset
 *   - includeDeleted: "true" to include soft-deleted facts
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag") ?? undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const offset = searchParams.get("offset")
    ? parseInt(searchParams.get("offset")!, 10)
    : undefined;
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const facts = await listFacts(auth.user.id, { tag, limit, offset, includeDeleted });
  const total = await countFacts(auth.user.id);

  return NextResponse.json({
    facts,
    total,
    count: facts.length,
  });
}

/**
 * POST /api/memory — create a fact (user-initiated).
 *
 * Body: { content: string, tags?: string[] }
 *
 * The fact is created with source: "user", sourceOrigin: "recall.app". An
 * audit entry is appended so the user can see the creation in the activity
 * feed (the feed itself is wired in the next task; the append is done now so
 * the audit trail is complete from the first fact).
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const toolAuth = await requireToolEnabled(auth.user, "addFact");
  if (!toolAuth.ok) return toolAuth.response;

  let body: { content?: string; tags?: string[] };
  try {
    body = (await request.json()) as { content?: string; tags?: string[] };
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const fact = await createFact(auth.user.id, {
      content: body.content ?? "",
      tags: body.tags,
    });

    // Append the audit entry.
    await appendAuditEntry({
      userId: auth.user.id,
      callerOrigin: "recall.app",
      toolName: "addFact",
      args: { content: fact.content, tags: fact.tags, factId: fact.id },
      result: { id: fact.id },
      resultCount: 1,
    });

    return NextResponse.json({ fact }, { status: 201 });
  } catch (err) {
    if (err instanceof FactValidationError) {
      return NextResponse.json(
        { error: "validation_error", field: err.field, message: err.message },
        { status: 400 },
      );
    }
    throw err;
  }
}

export const dynamic = "force-dynamic";
