import { db } from "@/lib/db";
import {
  DEFAULT_ENABLED_TOOLS,
  DEFAULT_GRANTED_ORIGINS,
  TOOL_NAMES,
  type ToolName,
} from "@/lib/constants";
import type { InArgs } from "@libsql/client";

/**
 * Recall — permissions data-access layer.
 *
 * Per-user permission state: which of the six tools are enabled, and which
 * agent origins are granted access. Every user has exactly one PermissionState
 * row (auto-created on first access).
 *
 * Blueprint §24.1 (PermissionState):
 *   - enabledTools: Set of tool names (default: all six)
 *   - grantedOrigins: Set of HTTPS URLs (default: ["https://chatgpt.com"])
 *
 * The WebMCP bridge (Task 4) registers only the ENABLED tools; when the user
 * disables a tool, the bridge re-registers without it. The capability-token
 * layer (Task 6) checks the scope against the enabled set before issuing a
 * token.
 */

export interface PermissionState {
  userId: string;
  enabledTools: ToolName[];
  grantedOrigins: string[];
  updatedAt: number;
}

interface PermissionRow {
  userId: string;
  enabledToolsJson: string;
  grantedOriginsJson: string;
  updatedAt: string;
}

/** Get the user's permission state, creating a default row if none exists. */
export async function getPermissionState(
  userId: string,
): Promise<PermissionState> {
  const result = await db.execute({
    sql: `SELECT userId, enabledToolsJson, grantedOriginsJson, updatedAt FROM PermissionState WHERE userId = ?`,
    args: [userId],
  });

  if (result.rows.length === 0) {
    // Auto-create the default state.
    await createDefaultPermissionState(userId);
    return {
      userId,
      enabledTools: [...DEFAULT_ENABLED_TOOLS],
      grantedOrigins: [...DEFAULT_GRANTED_ORIGINS],
      updatedAt: Date.now(),
    };
  }

  const row = result.rows[0] as unknown as PermissionRow;
  return {
    userId: row.userId,
    enabledTools: JSON.parse(row.enabledToolsJson) as ToolName[],
    grantedOrigins: JSON.parse(row.grantedOriginsJson) as string[],
    updatedAt: parseDate(row.updatedAt),
  };
}

/** Create the default permission state for a new user. */
export async function createDefaultPermissionState(
  userId: string,
): Promise<void> {
  const id = crypto.randomUUID();
  const enabledJson = JSON.stringify([...DEFAULT_ENABLED_TOOLS]);
  const originsJson = JSON.stringify([...DEFAULT_GRANTED_ORIGINS]);
  await db.execute({
    sql: `INSERT OR IGNORE INTO PermissionState (id, userId, enabledToolsJson, grantedOriginsJson, updatedAt) VALUES (?, ?, ?, ?, datetime('now'))`,
    args: [id, userId, enabledJson, originsJson] as InArgs,
  });
}

/** Check if a specific tool is enabled for the user. */
export async function isToolEnabled(
  userId: string,
  tool: ToolName,
): Promise<boolean> {
  const state = await getPermissionState(userId);
  return state.enabledTools.includes(tool);
}

/** Enable or disable a specific tool. */
export async function setToolEnabled(
  userId: string,
  tool: ToolName,
  enabled: boolean,
): Promise<PermissionState> {
  const state = await getPermissionState(userId);
  const current = new Set(state.enabledTools);

  if (enabled) {
    current.add(tool);
  } else {
    current.delete(tool);
  }

  // Ensure the set is a valid subset of TOOL_NAMES, preserving canonical order.
  const enabledTools = TOOL_NAMES.filter((t) => current.has(t));

  await db.execute({
    sql: `UPDATE PermissionState SET enabledToolsJson = ?, updatedAt = datetime('now') WHERE userId = ?`,
    args: [JSON.stringify(enabledTools), userId] as InArgs,
  });

  return { ...state, enabledTools };
}

/** Set the full enabled-tools set (validates against TOOL_NAMES). */
export async function setEnabledTools(
  userId: string,
  tools: ToolName[],
): Promise<PermissionState> {
  // Validate + deduplicate, preserving canonical order.
  const valid = new Set(tools.filter((t) => TOOL_NAMES.includes(t)));
  const enabledTools = TOOL_NAMES.filter((t) => valid.has(t));

  await db.execute({
    sql: `UPDATE PermissionState SET enabledToolsJson = ?, updatedAt = datetime('now') WHERE userId = ?`,
    args: [JSON.stringify(enabledTools), userId] as InArgs,
  });

  const state = await getPermissionState(userId);
  return { ...state, enabledTools };
}

/** Add a granted agent origin. */
export async function addGrantedOrigin(
  userId: string,
  origin: string,
): Promise<PermissionState> {
  const normalized = normalizeOrigin(origin);
  const state = await getPermissionState(userId);
  if (state.grantedOrigins.includes(normalized)) return state;

  const grantedOrigins = [...state.grantedOrigins, normalized];
  await db.execute({
    sql: `UPDATE PermissionState SET grantedOriginsJson = ?, updatedAt = datetime('now') WHERE userId = ?`,
    args: [JSON.stringify(grantedOrigins), userId] as InArgs,
  });

  return { ...state, grantedOrigins };
}

/** Remove a granted agent origin. */
export async function removeGrantedOrigin(
  userId: string,
  origin: string,
): Promise<PermissionState> {
  const normalized = normalizeOrigin(origin);
  const state = await getPermissionState(userId);
  const grantedOrigins = state.grantedOrigins.filter((o) => o !== normalized);

  await db.execute({
    sql: `UPDATE PermissionState SET grantedOriginsJson = ?, updatedAt = datetime('now') WHERE userId = ?`,
    args: [JSON.stringify(grantedOrigins), userId] as InArgs,
  });

  return { ...state, grantedOrigins };
}

/** Check if an origin is granted. */
export async function isOriginGranted(
  userId: string,
  origin: string,
): Promise<boolean> {
  const state = await getPermissionState(userId);
  return state.grantedOrigins.includes(normalizeOrigin(origin));
}

/** Normalize an origin URL (trim, ensure https://, strip trailing slash). */
function normalizeOrigin(origin: string): string {
  let normalized = origin.trim();
  if (!normalized) return normalized;
  // Ensure it has a protocol.
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  // Strip trailing slash.
  normalized = normalized.replace(/\/$/, "");
  return normalized;
}

function parseDate(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const iso = value.includes("T")
      ? value
      : value.replace(" ", "T") + "Z";
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return Date.now();
}
