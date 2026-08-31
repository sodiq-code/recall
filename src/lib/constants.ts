/**
 * Recall — shared constants.
 *
 * The six WebMCP tools, their annotations, the agent origins Recall grants
 * access to, and other site-wide values. Centralized here so the tool
 * registration module (lib/webmcp), the permission model (lib/capability),
 * and the audit log (lib/audit) all agree on names and shapes.
 */

/** The six WebMCP tools Recall publishes . */
export const TOOL_NAMES = [
  "query",
  "addFact",
  "updateFact",
  "forgetFact",
  "summarize",
  "timeline",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

/** Read-only tools — annotated with `readOnlyHint: true` per the WebMCP spec. */
export const READ_ONLY_TOOLS: ReadonlySet<ToolName> = new Set<ToolName>([
  "query",
  "summarize",
  "timeline",
]);

/** Tools that accept untrusted (agent-supplied) content — `untrustedContentHint: true`. */
export const UNTRUSTED_CONTENT_TOOLS: ReadonlySet<ToolName> = new Set<ToolName>([
  "addFact",
  "updateFact",
]);

/** Default granted agent origins (the ChatGPT in-app browser). */
export const DEFAULT_GRANTED_ORIGINS = ["https://chatgpt.com"] as const;

/** Capability token TTL defaults . */
export const CAPABILITY_TOKEN_DEFAULT_TTL_SECONDS = 120;
export const CAPABILITY_TOKEN_MIN_TTL_SECONDS = 60;
export const CAPABILITY_TOKEN_MAX_TTL_SECONDS = 300;

/** The default set of enabled tools for a new user — all six. */
export const DEFAULT_ENABLED_TOOLS: ToolName[] = [...TOOL_NAMES];

/** Validation bounds mirrored from the data model spec. */
export const LIMITS = {
  FACT_MIN_LENGTH: 1,
  FACT_MAX_LENGTH: 500,
  TAG_MAX_PER_FACT: 10,
  TAG_MAX_LENGTH: 30,
  QUERY_MAX_LENGTH: 200,
  QUERY_DEFAULT_LIMIT: 10,
  QUERY_MAX_LIMIT: 50,
  GRANTED_ORIGINS_MAX: 10,
  // Capability-token TTL bounds live as top-level exports above for direct
  // import by the capability module.
} as const;

/** Capability token audience for the ChatGPT in-app browser. */
export const CHATGPT_AUDIENCE = "https://chatgpt.com";

/** Cookie name for the session. */
export const SESSION_COOKIE = "recall_session";

/** Cookie options for the session cookie. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/** Application version, surfaced by /health. */
export const APP_VERSION = "0.1.0";

/** Human-readable service name (matches package.json). */
export const SERVICE_NAME = "recall";
