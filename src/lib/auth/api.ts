import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

/**
 * Recall — API auth helpers.
 *
 * Every /api/* route that touches user data must call `requireUser()`. It reads
 * the session cookie, verifies it against Turso, and returns either the user
 * or a 401 response. There is no other auth check in the API layer — the
 * session IS the authentication.
 *
 *  The session cookie is
 * httpOnly + sameSite=lax; the capability token (lib/capability) is the agent
 * credential layered on top for WebMCP tool calls (next tasks).
 */

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/** Require a signed-in user. Returns the user or a 401 response. */
export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "Sign in to access this resource." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, user };
}
