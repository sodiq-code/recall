/**
 * Recall — WebMCP tool registration entrypoint.
 *
 * This module is the single place Recall calls the browser's WebMCP API:
 * `document.modelContext.registerTool()`. It is imported only by authenticated
 * client components (the /app canvas on Day 4). On Day 1 it exists to lock in
 * the registration contract and the `fromOrigins` cross-origin grant; the live
 * wiring lands on Day 4 once the tool handlers and capability-token flow are
 * in place.
 *
 * Spec reference (blueprint §17, §21.1):
 *   - tools execute in the page sandbox (the browser's existing trust boundary)
 *   - handlers call back to the Recall backend over same-origin fetch
 *   - `fromOrigins: ['https://chatgpt.com']` grants the ChatGPT in-app
 *     browser cross-origin access to the registered tools
 */
import type {
  RegisterWebMCPToolsOptions,
  RegisteredTools,
} from "./types";
import { CHATGPT_AUDIENCE } from "@/lib/constants";

/**
 * The shape of the browser's WebMCP `document.modelContext` surface we depend
 * on. Declared locally (and loosely) so we don't ship a types package for an
 * emerging standard; this keeps the scaffold build-clean today.
 */
interface ModelContextApi {
  registerTool: (def: {
    name: string;
    description: string;
    inputSchema: unknown;
    annotations?: Record<string, unknown>;
    execute: (input: unknown) => Promise<unknown>;
  }) => () => void;
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
 * Register Recall's six WebMCP tools with the browser.
 *
 * Returns a handle whose `unregister()` removes every tool that was registered
 * (so a sign-out or permission change cleanly tears down the surface). When
 * the browser does not support WebMCP, the call is a no-op that returns an
 * empty handle — the Recall canvas still works for direct editing, the agent
 * simply cannot call tools until the user opens a WebMCP-capable browser
 * (ChatGPT in-app browser, or Chrome 149+ with the origin-trial flag).
 *
 * @param options.tools   the tool definitions to register (handler-wired Day 4)
 * @param options.fromOrigins  cross-origin agent origins granted access;
 *   defaults to the ChatGPT in-app browser origin
 */
export function registerWebMCPTools(
  options: RegisterWebMCPToolsOptions,
): RegisteredTools {
  const { tools, fromOrigins = [CHATGPT_AUDIENCE] } = options;

  if (!isWebMCPSupported()) {
    return { unregister: () => {}, registered: [] };
  }

  const unregisters: Array<() => void> = [];
  const registered: string[] = [];

  for (const tool of tools) {
    try {
      const unregister = document.modelContext!.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations as Record<string, unknown> | undefined,
        execute: tool.execute as (input: unknown) => Promise<unknown>,
      });
      unregisters.push(unregister);
      registered.push(tool.name);
    } catch (err) {
      // A single tool registration failure must not block the others.
      console.error(`[recall] failed to register tool "${tool.name}"`, err);
    }
  }

  // fromOrigins is currently honored by the browser via the permissions-policy
  // `tools` directive emitted on the page response (configured Day 6). We log
  // the intended grant set here so the registration is self-documenting during
  // the Day 4 integration.
  if (fromOrigins.length > 0) {
    console.debug("[recall] WebMCP tools registered for origins", fromOrigins);
  }

  return {
    registered,
    unregister: () => {
      for (const fn of unregisters) {
        try {
          fn();
        } catch {
          /* ignore — best-effort teardown */
        }
      }
    },
  };
}
