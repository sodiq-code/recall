import { NextResponse } from "next/server";
import { verifyCapability } from "@/lib/capability";
import type { ToolName } from "@/lib/constants";

/**
 * POST /api/capability-token/verify — verify a capability token.
 *
 * Body:
 *   - tokenId: string
 *   - toolName: ToolName
 *   - audience?: string (optional, checked if provided)
 *
 * Returns { valid: true, capability } or { valid: false, reason }.
 *
 * This endpoint is used by external parties (or the tool-call simulator) to
 * verify a token before making a tool call. The tool handlers themselves
 * don't call this — they call verifyCapability() directly.
 */
export async function POST(request: Request) {
  let body: {
    tokenId?: string;
    toolName?: ToolName;
    audience?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!body.tokenId || !body.toolName) {
    return NextResponse.json(
      { error: "missing_params", message: "tokenId and toolName are required." },
      { status: 400 },
    );
  }

  const capability = await verifyCapability(
    body.tokenId,
    body.toolName,
    body.audience,
  );

  if (!capability) {
    return NextResponse.json({
      valid: false,
      reason: "token_invalid_or_expired_or_tool_disabled",
    });
  }

  return NextResponse.json({
    valid: true,
    capability: {
      userId: capability.userId,
      audience: capability.audience,
      scope: capability.scope,
      capabilityTokenId: capability.capabilityTokenId,
      expiresAt: capability.expiresAt.toISOString(),
    },
  });
}

export const dynamic = "force-dynamic";
