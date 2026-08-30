import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { listTags } from "@/lib/memory";

/**
 * GET /api/memory/tags — list the distinct tags the user has used.
 *
 * Used by the memory canvas's tag filter chips. Returns tags for non-deleted
 * facts only, sorted alphabetically.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const tags = await listTags(auth.user.id);
  return NextResponse.json({ tags });
}

export const dynamic = "force-dynamic";
