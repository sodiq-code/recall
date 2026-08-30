import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";

/**
 * GET /api/auth/me — return the current session user's identity.
 *
 * Used by client components (the ActivityFeed) to learn the userId so they
 * can join the correct WebSocket room — without leaking it via a DOM
 * attribute. The userId is already authenticated by the session cookie; this
 * endpoint just makes it available to client-side code.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      avatarUrl: auth.user.avatarUrl,
      oauthProvider: auth.user.oauthProvider,
    },
  });
}

export const dynamic = "force-dynamic";
