import { NextResponse } from "next/server";
import { requireUser, requireToolEnabled } from "@/lib/auth/api";
import {
  getFact,
  updateFact,
  forgetFact,
  FactValidationError,
} from "@/lib/memory";
import { appendAuditEntry } from "@/lib/audit";

/**
 * GET /api/memory/:id — get one fact.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const fact = await getFact(auth.user.id, id);
  if (!fact) {
    return NextResponse.json(
      { error: "not_found", message: "Fact not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ fact });
}

/**
 * PATCH /api/memory/:id — update a fact's content and/or tags.
 *
 * Body: { content?: string, tags?: string[] }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const toolAuth = await requireToolEnabled(auth.user, "updateFact");
  if (!toolAuth.ok) return toolAuth.response;

  const { id } = await params;
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
    const fact = await updateFact(auth.user.id, id, body);
    if (!fact) {
      return NextResponse.json(
        { error: "not_found", message: "Fact not found." },
        { status: 404 },
      );
    }

    await appendAuditEntry({
      userId: auth.user.id,
      callerOrigin: "recall.app",
      toolName: "updateFact",
      args: { factId: fact.id, content: fact.content, tags: fact.tags },
      result: { id: fact.id },
      resultCount: 1,
    });

    return NextResponse.json({ fact });
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

/**
 * DELETE /api/memory/:id — soft-delete (forget) a fact.
 *
 * The fact is not permanently removed — it's marked as deleted (deletedAt)
 * and hidden from default queries. The audit entry records the forget so it
 * can be rolled back from the activity feed.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const toolAuth = await requireToolEnabled(auth.user, "forgetFact");
  if (!toolAuth.ok) return toolAuth.response;

  const { id } = await params;
  const fact = await forgetFact(auth.user.id, id);
  if (!fact) {
    return NextResponse.json(
      { error: "not_found", message: "Fact not found." },
      { status: 404 },
    );
  }

  await appendAuditEntry({
    userId: auth.user.id,
    callerOrigin: "recall.app",
    toolName: "forgetFact",
    args: { factId: fact.id },
    result: { id: fact.id, deletedAt: fact.deletedAt },
    resultCount: 1,
  });

  return NextResponse.json({ fact, forgotten: true });
}

export const dynamic = "force-dynamic";
