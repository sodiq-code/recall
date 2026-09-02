import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getPermissionState } from "@/lib/permissions";
import type { ToolName } from "@/lib/constants";

/**
 * Recall — API auth helpers.
 *
 * Every /api/* route that touches user data must call `requireUser()`. It reads
 * the session cookie, verifies it against the database, and returns either the
 * user or a 401 response.
 *
 * For tool-execution routes (addFact, updateFact, forgetFact, query), call
 * `requireToolEnabled(user, toolName)` after `requireUser()`. It checks the
 * user's current permission state and returns 403 if the tool is disabled.
 * This is the runtime enforcement that complements the capability-token scope
 * check — the permission state is re-read from the database on every call, so
 * disabling a tool takes effect immediately.
 */

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export type ToolAuthResult =
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

/**
 * Require that a specific tool is enabled for the authenticated user.
 *
 * Call after requireUser() in tool-execution routes. Returns 403 if the user
 * has disabled the tool in Settings. The permission state is re-read from the
 * database on every call, so a post-issuance disable takes effect immediately.
 */
export async function requireToolEnabled(
  user: SessionUser,
  toolName: ToolName,
): Promise<ToolAuthResult> {
  const permState = await getPermissionState(user.id);
  if (!permState.enabledTools.includes(toolName)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "tool_disabled",
          message: `The ${toolName} tool is disabled. Enable it in Settings to allow this action.`,
          toolName,
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, user };
}
