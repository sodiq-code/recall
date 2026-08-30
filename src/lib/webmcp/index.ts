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
 *   - exposedTo goes in the OPTIONS (2nd arg), NOT on the tool definition
 *   - execute is a ToolExecuteCallback: (inputObject, options) => MaybePromise<unknown>
 *     where options is { signal: AbortSignal }
 *   - The "tools" permissions-policy feature defaults to 'self'
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
  execute: (inputObject: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown>;
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
 * Register Recall's WebMCP tools with the browser.
 *
 * This is ASYNC — registerTool() returns a Promise per the spec. The function
 * awaits all registrations and returns a handle whose `unregister()` aborts
 * every tool's AbortController (tearing them down cleanly).
 *
 * @param options.tools   the tool definitions to register
 * @param options.fromOrigins  cross-origin agent origins granted access;
 *   passed as `exposedTo` in the registerTool options per the spec.
 */
export async function registerWebMCPTools(
  options: RegisterWebMCPToolsOptions,
): Promise<RegisteredTools> {
  const { tools, fromOrigins = [CHATGPT_AUDIENCE] } = options;

  if (!isWebMCPSupported()) {
    return { unregister: () => {}, registered: [] };
  }

  const abortControllers: AbortController[] = [];
  const registered: string[] = [];

  const registrationPromises = tools.map(async (tool) => {
    const ac = new AbortController();
    abortControllers.push(ac);

    try {
      await document.modelContext!.registerTool(
        {
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: async (inputObject) => {
            return tool.execute(inputObject);
          },
          annotations: tool.annotations,
        },
        {
          exposedTo: fromOrigins,
          signal: ac.signal,
        },
      );
      registered.push(tool.name);
    } catch (err) {
      // A single tool registration failure must not block the others.
      console.error(
        `[recall] failed to register tool "${tool.name}"`,
        err,
      );
    }
  });

  await Promise.allSettled(registrationPromises);

  return {
    registered,
    unregister: () => {
      for (const ac of abortControllers) {
        try {
          ac.abort();
        } catch {
          /* ignore — best-effort teardown */
        }
      }
    },
  };
}
