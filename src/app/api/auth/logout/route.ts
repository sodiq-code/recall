import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout — end the current session.
 *
 * Deletes the session row from Turso and clears the session cookie. Always
 * returns 200 (even if there was no session) so the client can always
 * redirect to / after the call.
 */
export async function POST() {
  await destroySession();
  return NextResponse.json({ status: "ok", redirectTo: "/" });
}

export const dynamic = "force-dynamic";
