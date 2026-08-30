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
 * feature-detected in `lib/webmcp/index.ts` so Day 1 can ship the type
 * contracts before the live integration lands on Day 4.
 */

/** JSON Schema object — the shape WebMCP expects for `inputSchema`. */
export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** WebMCP tool annotations (blueprint §22.3, §6.3.x of the spec). */
export interface ToolAnnotations {
  /** True for read-only tools (query, summarize, timeline). */
  readOnlyHint?: boolean;
  /** True for tools that accept untrusted, agent-supplied content. */
  untrustedContentHint?: boolean;
}

/** A single WebMCP tool definition — matches `document.modelContext.registerTool()`. */
export interface WebMCPToolDefinition<TInput = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: ToolAnnotations;
  execute: (input: TInput) => Promise<TResult>;
}

/** The full registration bundle passed to `registerWebMCPTools`. */
export interface RegisterWebMCPToolsOptions {
  tools: WebMCPToolDefinition[];
  /** Cross-origin agent origins granted access to the tools. */
  fromOrigins?: string[];
}

/** The result of registering — an `unregister()` to tear tools down. */
export interface RegisteredTools {
  unregister: () => void;
  /** Names of the tools that were registered. */
  registered: string[];
}

/** Capability-token-verified invocation context (Day 6). */
export interface ToolCallContext {
  userId: string;
  callerOrigin: string;
  capabilityTokenId: string;
}
