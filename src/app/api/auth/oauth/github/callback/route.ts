import { NextResponse } from "next/server";
import {
  verifyState,
  exchangeCodeForToken,
  fetchGitHubUser,
  findOrCreateUser,
} from "@/lib/auth/github";
import { createSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

/**
 * GET /api/auth/oauth/github/callback — handle the GitHub OAuth callback.
 *
 * GitHub redirects here with `?code=...&state=...`. We:
 *   1. verify the state matches the cookie we set on flow start (CSRF)
 *   2. exchange the code for an access token
 *   3. fetch the GitHub user profile + primary email
 *   4. find or create the User row in Turso
 *   5. create a Recall session and set the session cookie
 *   6. redirect to /app (the memory canvas)
 *
 * On any error, redirect to /login?error=... so the login page can display
 * a friendly message.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // GitHub may return an error directly (user denied access).
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/login?error=missing_params", request.url),
    );
  }

  // Verify the CSRF state.
  const stateOk = await verifyState(state);
  if (!stateOk) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_state", request.url),
    );
  }

  // Exchange the code for an access token.
  const accessToken = await exchangeCodeForToken(code);
  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/login?error=token_exchange_failed", request.url),
    );
  }

  // Fetch the GitHub user profile.
  const ghUser = await fetchGitHubUser(accessToken);
  if (!ghUser) {
    return NextResponse.redirect(
      new URL("/login?error=user_fetch_failed", request.url),
    );
  }

  // Find or create the User row.
  const user = await findOrCreateUser(ghUser);

  // Create a session and set the cookie.
  await createSession(user.id);

  // Redirect to the app.
  return NextResponse.redirect(new URL("/app", request.url));
}

// Force dynamic — this route reads cookies and query params.
export const dynamic = "force-dynamic";
