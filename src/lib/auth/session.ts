/**
 * Recall — session helpers (foundation; fully wired on Day 2).
 *
 * On Day 1 this module establishes the session contract used by every
 * authenticated route and the WebMCP tool handlers: a server-side session
 * keyed by an opaque, cryptographically-random cookie token. The
 * GitHub-OAuth-backed implementation lands on Day 2.
 *
 * Design notes (blueprint §21.1, §26.2):
 *   - The session cookie is httpOnly + sameSite=lax; the value is an opaque
 *     token, not a JWT, so revoking a session is a single row delete.
 *   - `getSession()` returns the user for the current request or null. It is
 *     the single entry point every route uses — there is no other auth check.
 *   - The WebMCP tool handlers re-derive the caller origin and capability
 *     token (Day 6); the session is the human user, the capability token is
 *     the agent.
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/constants";

/** The authenticated user shape surfaced to routes and components. */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  oauthProvider: string;
}

/**
 * Read the session for the current request.
 *
 * Day 1: queries the Session table for a non-expired, non-revoked token. The
 * token comes from the session cookie. Returns null when there is no session,
 * the token is unknown, or the session has expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
    oauthProvider: session.user.oauthProvider,
  };
}

/**
 * Create a session for a user and set the session cookie on the response.
 *
 * Returns the opaque token. Day 2 wires this into the GitHub OAuth callback.
 */
export async function createSession(userId: string): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  await db.session.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

/** Destroy the current session (sign-out). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}
