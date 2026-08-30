import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { issueCapability } from "@/lib/capability";
import { getPermissionState } from "@/lib/permissions";
import { CHATGPT_AUDIENCE, type ToolName } from "@/lib/constants";
import { appendAuditEntry } from "@/lib/audit";

/**
 * POST /api/capability-token — issue a new capability token.
 *
 * Body (optional):
 *   - audience: string (defaults to https://chatgpt.com)
 *   - scope: ToolName[] (defaults to all enabled tools)
 *   - ttlSeconds: number (clamped to [60, 300], default 120)
 *
 * Returns the issued token (id, audience, scope, expiresAt, signature).
 * The token is signed with the user's site key (WebCrypto ECDSA P-256).
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: {
    audience?: string;
    scope?: ToolName[];
    ttlSeconds?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  // Verify the requested audience is a granted origin.
  const permState = await getPermissionState(auth.user.id);
  const audience = body.audience ?? CHATGPT_AUDIENCE;
  if (!permState.grantedOrigins.includes(audience)) {
    return NextResponse.json(
      {
        error: "origin_not_granted",
        message: `The origin "${audience}" is not in your granted origins. Add it in Settings first.`,
      },
      { status: 403 },
    );
  }

  const token = await issueCapability({
    userId: auth.user.id,
    audience,
    scope: body.scope,
    ttlSeconds: body.ttlSeconds,
  });

  // Append an audit entry for the token issuance.
  await appendAuditEntry({
    userId: auth.user.id,
    callerOrigin: "recall.app",
    toolName: "timeline",
    args: { action: "issue_capability", audience: token.audience },
    result: { tokenId: token.id },
    resultCount: 1,
  });

  return NextResponse.json({ token }, { status: 201 });
}

export const dynamic = "force-dynamic";
