/**
 * Recall — WebMCP tool registration entrypoint.
 *
 * This module is the single place Recall calls the browser's WebMCP API:
 * `document.modelContext.registerTool()`. It is imported only by authenticated
 * client components (the /app canvas).
 *
 * Spec reference (https://github.com/webmachinelearning/webmcp):
 *   - registerTool(tool, options) returns Promise<void>
 *   - The tool dictionary: { name, title?, description, inputSchema?, execute,
 *     annotations? }
 *   - The options dictionary: { exposedTo?: string[], signal?: AbortSignal }
 *   - CRITICAL: exposedTo should NOT be passed for the built-in browser agent.
 *     The spec says: "by default in the top-level document, a missing exposedTo
 *     array would expose tools to the built-in agent." The ChatGPT in-app
 *     browser IS the built-in agent, so we must NOT pass exposedTo — passing it
 *     would restrict exposure to only those origins, preventing the built-in
 *     agent from seeing the tools.
 *   - execute is a ToolExecuteCallback: (inputObject, options) => MaybePromise<unknown>
 *     where options is { signal: AbortSignal }
 *   - Tool responses should be in MCP content format:
 *     { content: [{ type: "text", text: "..." }] }
 *     The official useWebMCP hook normalizes all returns to this format.
 */

import type {
  RegisterWebMCPToolsOptions,
  RegisteredTools,
} from "./types";
import { CHATGPT_AUDIENCE } from "@/lib/constants";

/**
 * The shape of the browser's WebMCP `document.modelContext` surface, matching
 * the official webmcp-types package (https://www.npmjs.com/package/webmcp-types).
 */
interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  execute: (
    inputObject: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => Promise<unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

interface ModelContextRegisterToolOptions {
  exposedTo?: string[];
  signal?: AbortSignal;
}

interface ModelContextApi {
  registerTool: (
    tool: ModelContextTool,
    options?: ModelContextRegisterToolOptions,
  ) => Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContextApi;
  }
}

/** True when the current browser exposes the WebMCP API. */
export function isWebMCPSupported(): boolean {
  return typeof document !== "undefined" && "modelContext" in document;
}

/**
 * Normalize a tool's return value into the MCP content format.
 *
 * The official useWebMCP hook does this normalization. We replicate it here
 * so our tool handlers can return plain objects/strings and the agent still
 * receives a valid MCP response.
 *
 * - A string → { content: [{ type: "text", text }] }
 * - undefined/null → { content: [] } (success, no payload)
 * - Already { content: [...] } → passed through untouched
 * - A thrown value → { content: [{ type: "text", text }], isError: true }
 * - Anything else (object/array/number) → JSON-serialized into a text block
 */
function toToolResponse(value: unknown): unknown {
  // Already a well-formed MCP tool result — pass through untouched.
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { content?: unknown[] }).content)
  ) {
    return value;
  }

  // execute returned nothing — report a successful, empty result.
  if (value === undefined || value === null) {
    return { content: [] };
  }

  // Strings map directly to a single text block.
  if (typeof value === "string") {
    return { content: [{ type: "text", text: value }] };
  }

  // Anything else (objects, arrays, numbers) is serialized to JSON text.
  return {
    content: [
      { type: "text", text: JSON.stringify(value) },
    ],
  };
}

/**
 * Convert any error into an MCP error response.
 */
function toErrorResponse(error: unknown): unknown {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : safeStringify(error);
  return { content: [{ type: "text", text }], isError: true };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Register Recall's WebMCP tools with the browser.
 *
 * This is ASYNC — registerTool() returns a Promise per the spec. The function
 * awaits all registrations and returns a handle whose `unregister()` aborts
 * every tool's AbortController (tearing them down cleanly).
 *
 * CRITICAL: We do NOT pass `exposedTo` in the options. The spec says the
 * built-in browser agent (ChatGPT in-app browser) gets access to tools by
 * default when `exposedTo` is missing. Passing `exposedTo` would restrict
 * exposure to only those origins, preventing the built-in agent from seeing
 * the tools.
 *
 * @param options.tools   the tool definitions to register
 * @param options.fromOrigins  (unused — kept for API compat; the built-in
 *   agent gets access by default)
 */
export function registerWebMCPTools(
  options: RegisterWebMCPToolsOptions,
): RegisteredTools & { ready: Promise<RegisteredTools> } {
  const { tools } = options;

  if (!isWebMCPSupported()) {
    const empty = { unregister: () => {}, registered: [] };
    return { ...empty, ready: Promise.resolve(empty) };
  }

  // Create all AbortControllers synchronously
  const abortControllers: AbortController[] = tools.map(() => new AbortController());
  const registered: string[] = [];

  const unregister = () => {
    for (const ac of abortControllers) {
      try {
        ac.abort();
      } catch {
        /* ignore */
      }
    }
  };

  // Register tools SEQUENTIALLY — one at a time, waiting for each.
  // Parallel registration (Promise.allSettled) causes a browser-internal
  // race condition where one tool gets InvalidStateError.
  const ready = (async () => {
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const ac = abortControllers[i];

      if (ac.signal.aborted) break;

      try {
        await document.modelContext!.registerTool(
          {
            name: tool.name,
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            async execute(
              inputObject: Record<string, unknown>,
              _executeOptions: { signal: AbortSignal },
            ) {
              try {
                const result = await tool.execute(inputObject);
                return toToolResponse(result);
              } catch (error) {
                return toErrorResponse(error);
              }
            },
            annotations: tool.annotations,
          },
          {
            signal: ac.signal,
          },
        );
        registered.push(tool.name);
      } catch (err) {
        if (ac.signal.aborted) break;
        console.error(
          `[recall] failed to register tool "${tool.name}"`,
          err,
        );
      }
    }

    return { registered, unregister };
  })();

  return { registered, unregister, ready };
}
