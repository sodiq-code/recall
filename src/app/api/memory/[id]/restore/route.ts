import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { restoreFact } from "@/lib/memory";
import { appendAuditEntry } from "@/lib/audit";

/**
 * POST /api/memory/[id]/restore — restore a soft-deleted (forgotten) fact.
 *
 * Clears deletedAt so the fact reappears in queries. This is the "undo" path
 * for the rollback button on a forgetFact audit entry.
 *
 * Appends an audit entry recording the restore (so the audit trail stays
 * complete — every mutation is logged, including undos).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const fact = await restoreFact(auth.user.id, id);
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
    args: { factId: fact.id, action: "restore" },
    result: { id: fact.id },
    resultCount: 1,
  });

  return NextResponse.json({ fact, restored: true });
}

export const dynamic = "force-dynamic";
