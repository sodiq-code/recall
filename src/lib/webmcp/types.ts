/**
 * Recall — WebMCP shared types.
 *
 * These describe the tool surface Recall publishes through
 * `document.modelContext.registerTool()`. Defining them once (and importing
 * them from the client registration module, the server-side tool handlers,
 * and the audit log) keeps the six tools' schemas in lockstep with their
 * audit-trail provenance.
 *
 * The WebMCP browser API surface we model here mirrors the spec's
 * `document.modelContext.registerTool()` call shape (see
 * https://webmcp.devpost.com/ — "What to Submit"). The actual runtime call is
 * feature-detected in `lib/webmcp/index.ts` so the types can ship
 * contracts before the live integration.
 */

/** JSON Schema object — the shape WebMCP expects for `inputSchema`. */
export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** WebMCP tool annotations (per the WebMCP spec). */
export interface ToolAnnotations {
  /** True for read-only tools (query, summarize, timeline). */
  readOnlyHint?: boolean;
  /** True for tools that accept untrusted, agent-supplied content. */
  untrustedContentHint?: boolean;
}

/** A single WebMCP tool definition — matches `document.modelContext.registerTool()`. */
export interface WebMCPToolDefinition<TInput = Record<string, unknown>, TResult = unknown> {
  name: string;
  /** A human-readable title for the tool (shown in the agent's UI). */
  title?: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: ToolAnnotations;
  /** The execute callback. Per the spec, takes (inputObject, options) where
   *  options has { signal: AbortSignal }. */
  execute: (
    input: TInput,
    options?: { signal: AbortSignal },
  ) => Promise<TResult>;
}

/** The full registration bundle passed to `registerWebMCPTools`. */
export interface RegisterWebMCPToolsOptions {
  tools: WebMCPToolDefinition[];
  /** Cross-origin agent origins granted access to the tools. Passed as
   *  `exposedOrigins` on each tool definition per the spec. */
  fromOrigins?: string[];
}

/** The result of registering — an `unregister()` to tear tools down. */
export interface RegisteredTools {
  unregister: () => void;
  /** Names of the tools that were registered. */
  registered: string[];
}

/** Capability-token-verified invocation context. */
export interface ToolCallContext {
  userId: string;
  callerOrigin: string;
  capabilityTokenId: string;
}
