import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Recall — GitHub OAuth helpers.
 *
 * Implements the GitHub OAuth Web Application Flow (blueprint §21.1, §26.2):
 *   1. redirect the user to github.com/login/oauth/authorize
 *   2. GitHub redirects back with a `code` + the `state` we sent
 *   3. exchange the code for an access token (POST /login/oauth/access_token)
 *   4. fetch the user profile (GET /api/user) + primary email
 *   5. find or create the User row in Turso; issue a Recall session
 *
 * The `state` parameter is a CSRF token: generated on flow start, stored in a
 * short-lived cookie, and verified on callback. This prevents an attacker
 * from injecting their own authorization code into the user's session.
 *
 * GitHub OAuth is the demo-day substitute for ChatGPT OAuth (blueprint §21.1):
 * third-party ChatGPT OAuth is not yet GA. The README and /login page document
 * this trade-off; the production plan swaps in ChatGPT OAuth when it ships.
 */

const STATE_COOKIE = "recall_oauth_state";
const SCOPES = "read:user user:email";

/** The GitHub OAuth authorize URL we redirect the user to. */
export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

/** The GitHub OAuth token-exchange URL. */
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

/** The GitHub API user endpoint. */
export const GITHUB_USER_URL = "https://api.github.com/user";

/** The GitHub API emails endpoint (for private emails). */
export const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

/** The callback URL for our app. */
export function getCallbackUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/auth/oauth/github/callback`;
}

/** Start the OAuth flow: generate a state token, store it in a cookie. */
export async function startOAuthFlow(): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — long enough to complete the flow
  });
  return state;
}

/** Build the full authorize URL with client_id, redirect_uri, state, scope. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID!,
    redirect_uri: getCallbackUrl(),
    state,
    scope: SCOPES,
    allow_signup: "true",
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

/** Verify the state cookie matches the state returned by GitHub. */
export async function verifyState(state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!stored) return false;
  // Constant-time-ish comparison.
  return stored === state && stored.length === state.length;
}

/** Exchange the authorization code for an access token. */
export async function exchangeCodeForToken(
  code: string,
): Promise<string | null> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: getCallbackUrl(),
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; error?: string };
  return data.access_token ?? null;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/** Fetch the GitHub user profile + primary email. */
export async function fetchGitHubUser(
  accessToken: string,
): Promise<GitHubUser | null> {
  const [profileRes, emailsRes] = await Promise.all([
    fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Recall",
      },
    }),
    fetch(GITHUB_EMAILS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Recall",
      },
    }),
  ]);

  if (!profileRes.ok) return null;
  const profile = (await profileRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };

  // Use the profile email if public; otherwise the primary verified email.
  let email = profile.email;
  if (!email && emailsRes.ok) {
    const emails = (await emailsRes.json()) as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];
    email =
      emails.find((e) => e.primary && e.verified)?.email ??
      emails.find((e) => e.verified)?.email ??
      null;
  }

  return {
    id: profile.id,
    login: profile.login,
    name: profile.name,
    email,
    avatarUrl: profile.avatar_url,
  };
}

/**
 * Find or create a User row from a GitHub profile.
 *
 * The unique key is (oauthProvider, oauthSubject) = ("github", <github id>).
 * On first sign-in we create the row; on subsequent sign-ins we update the
 * email/name/avatar (which can change on GitHub) but never the id.
 */
export async function findOrCreateUser(
  gh: GitHubUser,
): Promise<{ id: string; email: string; name: string | null; avatarUrl: string | null; isNew: boolean }> {
  const oauthSubject = String(gh.id);

  // Look up by (oauthProvider, oauthSubject).
  const existing = await db.execute({
    sql: `SELECT id, email, name, avatarUrl FROM "User" WHERE oauthProvider = 'github' AND oauthSubject = ?`,
    args: [oauthSubject],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as unknown as {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
    };
    // Update mutable fields (email/name/avatar can change on GitHub).
    await db.execute({
      sql: `UPDATE "User" SET email = ?, name = ?, avatarUrl = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [gh.email ?? row.email, gh.name, gh.avatarUrl, row.id],
    });
    return {
      id: row.id,
      email: gh.email ?? row.email,
      name: gh.name,
      avatarUrl: gh.avatarUrl,
      isNew: false,
    };
  }

  // Create a new user.
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO "User" (id, oauthProvider, oauthSubject, email, name, avatarUrl, createdAt, updatedAt) VALUES (?, 'github', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    args: [id, oauthSubject, gh.email ?? `${gh.login}@users.noreply.github.com`, gh.name, gh.avatarUrl],
  });
  return {
    id,
    email: gh.email ?? `${gh.login}@users.noreply.github.com`,
    name: gh.name,
    avatarUrl: gh.avatarUrl,
    isNew: true,
  };
}
