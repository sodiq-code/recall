import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import {
  getPermissionState,
  setToolEnabled,
  setEnabledTools,
  addGrantedOrigin,
  removeGrantedOrigin,
} from "@/lib/permissions";
import { TOOL_NAMES, type ToolName } from "@/lib/constants";

/**
 * GET /api/permissions — get the user's permission state.
 *
 * Returns the per-tool enable/disable state and the granted agent origins.
 * Auto-creates a default state on first access (all six tools enabled,
 * chatgpt.com granted).
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const state = await getPermissionState(auth.user.id);
  return NextResponse.json({ state });
}

/**
 * PATCH /api/permissions — update the user's permission state.
 *
 * Body (any subset of):
 *   - { action: "toggleTool", tool: ToolName, enabled: boolean }
 *   - { action: "setEnabledTools", tools: ToolName[] }
 *   - { action: "addOrigin", origin: string }
 *   - { action: "removeOrigin", origin: string }
 *
 * Returns the updated state.
 */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: {
    action?: string;
    tool?: string;
    enabled?: boolean;
    tools?: string[];
    origin?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { action } = body;
  if (!action) {
    return NextResponse.json(
      { error: "missing_action", message: "Body must include an 'action' field." },
      { status: 400 },
    );
  }

  try {
    let state;
    switch (action) {
      case "toggleTool": {
        if (!body.tool || !TOOL_NAMES.includes(body.tool as ToolName)) {
          return NextResponse.json(
            { error: "invalid_tool", message: `Tool must be one of: ${TOOL_NAMES.join(", ")}` },
            { status: 400 },
          );
        }
        state = await setToolEnabled(
          auth.user.id,
          body.tool as ToolName,
          body.enabled ?? false,
        );
        break;
      }
      case "setEnabledTools": {
        if (!Array.isArray(body.tools)) {
          return NextResponse.json(
            { error: "invalid_tools", message: "'tools' must be an array." },
            { status: 400 },
          );
        }
        state = await setEnabledTools(auth.user.id, body.tools as ToolName[]);
        break;
      }
      case "addOrigin": {
        if (!body.origin) {
          return NextResponse.json(
            { error: "missing_origin", message: "'origin' is required." },
            { status: 400 },
          );
        }
        state = await addGrantedOrigin(auth.user.id, body.origin);
        break;
      }
      case "removeOrigin": {
        if (!body.origin) {
          return NextResponse.json(
            { error: "missing_origin", message: "'origin' is required." },
            { status: 400 },
          );
        }
        state = await removeGrantedOrigin(auth.user.id, body.origin);
        break;
      }
      default:
        return NextResponse.json(
          { error: "unknown_action", message: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ state });
  } catch (err) {
    return NextResponse.json(
      {
        error: "update_failed",
        message: err instanceof Error ? err.message : "Failed to update permissions",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
