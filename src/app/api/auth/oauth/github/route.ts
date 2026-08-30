import { NextResponse } from "next/server";
import { startOAuthFlow, buildAuthorizeUrl } from "@/lib/auth/github";
import { env } from "@/lib/env";

/**
 * GET /api/auth/oauth/github — start the GitHub OAuth flow.
 *
 * Generates a CSRF state token, stores it in a short-lived cookie, and
 * redirects the user to GitHub's authorize URL. GitHub will redirect back
 * to /api/auth/oauth/github/callback with the authorization code.
 *
 * If GitHub OAuth credentials are not configured, return a 503 with a clear
 * message so the /login page can detect this and show the fallback.
 */
export async function GET() {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error: "github_oauth_not_configured",
        message:
          "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required. See .env.example.",
      },
      { status: 503 },
    );
  }

  const state = await startOAuthFlow();
  const authorizeUrl = buildAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}
