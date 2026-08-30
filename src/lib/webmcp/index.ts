/**
 * Recall — WebMCP tool registration entrypoint.
 *
 * This module is the single place Recall calls the browser's WebMCP API:
 * `document.modelContext.registerTool()`. It is imported only by authenticated
 * client components (the /app canvas).
 *
 * Spec reference (https://github.com/webmachinelearning/webmcp):
 *   - registerTool() returns a PROMISE that resolves when registration completes
 *   - The second argument is { signal: AbortSignal } — abort the signal to
 *     unregister the tool
 *   - Tool definitions include: name, description, inputSchema, execute,
 *     annotations, and exposedOrigins (the list of agent origins granted
 *     cross-origin access)
 *   - exposedOrigins is the spec's "exposed origins" field — it's how
 *     cross-origin agents (like chatgpt.com) are granted access
 */

import type {
  RegisterWebMCPToolsOptions,
  RegisteredTools,
} from "./types";
import { CHATGPT_AUDIENCE } from "@/lib/constants";

/**
 * The shape of the browser's WebMCP `document.modelContext` surface.
 * Declared locally so we don't ship a types package for an emerging standard.
 */
interface ModelContextApi {
  registerTool: (
    def: {
      name: string;
      description: string;
      inputSchema?: unknown;
      execute: (input: unknown) => Promise<unknown>;
      annotations?: {
        readOnlyHint?: boolean;
        untrustedContentHint?: boolean;
      };
      /** The origins granted cross-origin access to this tool. */
      exposedOrigins?: string[];
    },
    options?: { signal?: AbortSignal },
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
 * When the browser does not support WebMCP, the call is a no-op.
 *
 * @param options.tools   the tool definitions to register
 * @param options.fromOrigins  cross-origin agent origins granted access;
 *   defaults to the ChatGPT in-app browser origin. Passed as `exposedOrigins`
 *   on each tool definition per the spec.
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

  // Register each tool. registerTool() returns a Promise; we await all of them.
  const registrationPromises = tools.map(async (tool) => {
    const ac = new AbortController();
    abortControllers.push(ac);

    try {
      await document.modelContext!.registerTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: tool.execute as (input: unknown) => Promise<unknown>,
          annotations: tool.annotations,
          // exposedOrigins: the origins granted cross-origin access to this
          // tool. This is the spec's "exposed origins" field — it's how
          // chatgpt.com gets access to Recall's tools.
          exposedOrigins: fromOrigins,
        },
        { signal: ac.signal },
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

  // Wait for all registrations to complete (or fail).
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
