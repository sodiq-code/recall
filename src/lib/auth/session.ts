import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Recall — session helpers.
 *
 * A server-side session keyed by an opaque, cryptographically-random cookie
 * token. The session row lives in Turso; the cookie value is the token (not a
 * JWT) so revoking a session is a single row delete.
 *
 * The session is the human user; the capability token (lib/capability) is the
 * agent. Both are checked on every authenticated request.
 *
 * Dev mode: when GitHub OAuth is not configured (GITHUB_CLIENT_ID missing),
 * getSessionUser auto-provisions a local demo user + session so the app is
 * fully explorable without external dependencies.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  oauthProvider: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  oauthProvider: string;
}

/** True when GitHub OAuth env vars are configured (production auth path). */
function isOAuthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.SESSION_SECRET,
  );
}

/** The stable demo user id used in dev mode (no OAuth configured). */
const DEV_USER_ID = "dev-user-local";
const DEV_USER_EMAIL = "demo@recall.local";
const DEV_USER_NAME = "Demo User";

/**
 * Read the session for the current request.
 *
 * Returns null when there is no session cookie, the token is unknown, or the
 * session has expired.
 *
 * In dev mode (no OAuth configured), auto-provisions a demo user + session.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Dev mode: no OAuth configured — auto-login as the demo user.
  // We do NOT set a cookie here (cookies().set() throws during SSR in
  // server components). The demo user is returned on every request; the
  // session row is only needed for the production OAuth path.
  if (!isOAuthConfigured()) {
    return {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: DEV_USER_NAME,
      avatarUrl: null,
      oauthProvider: "github",
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await db.execute({
    sql: `
      SELECT u.id, u.email, u.name, u.avatarUrl, u.oauthProvider
      FROM Session s
      JOIN "User" u ON u.id = s.userId
      WHERE s.token = ? AND s.expiresAt > datetime('now')
    `,
    args: [token],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0] as unknown as UserRow;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    oauthProvider: row.oauthProvider,
  };
}

/**
 * Create a session for a user and set the session cookie on the response.
 *
 * Returns the opaque token.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
  const expiresAtIso = expiresAt.toISOString().replace("T", " ").replace("Z", "");

  await db.execute({
    sql: `INSERT INTO Session (id, userId, token, createdAt, expiresAt) VALUES (?, ?, ?, datetime('now'), ?)`,
    args: [crypto.randomUUID(), userId, token, expiresAtIso],
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
    await db.execute({ sql: `DELETE FROM Session WHERE token = ?`, args: [token] }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}
