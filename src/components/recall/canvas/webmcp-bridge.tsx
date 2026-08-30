"use client";

import * as React from "react";
import {
  registerWebMCPTools,
  isWebMCPSupported,
} from "@/lib/webmcp";
import { RECALL_TOOLS } from "@/lib/webmcp/recall-tools";
import { CHATGPT_AUDIENCE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Recall — WebMCP bridge.
 *
 * The client component that registers Recall's six WebMCP tools with the
 * browser when a signed-in user opens /app. Registration happens once on mount
 * and tears down on unmount (sign-out, navigation away).
 *
 * The `fromOrigins` grant defaults to `['https://chatgpt.com']` — the ChatGPT
 * in-app browser origin. This is the cross-origin grant that lets ChatGPT's
 * agent runtime call Recall's tools through the page's existing sandbox
 * (blueprint §17, §21.1).
 *
 * When the browser does NOT support WebMCP (no `document.modelContext`), the
 * component shows a "not available" badge and the tools are not registered —
 * the Recall canvas still works for direct editing, the agent simply cannot
 * call tools until the user opens a WebMCP-capable browser (ChatGPT in-app
 * browser, or Chrome 149+ with the origin-trial flag).
 *
 * Blueprint §32 (Day 4 definition of done): "document.modelContext.registerTool()
 * for all six tools; query() handler calls /api/memory/query; tool definitions
 * include readOnlyHint/untrustedContentHint; fromOrigins=['https://chatgpt.com']"
 */

type RegistrationState = "unsupported" | "registering" | "registered" | "failed";

export function WebMCPBridge() {
  const [state, setState] = React.useState<RegistrationState>("registering");
  const [registeredTools, setRegisteredTools] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Feature-detect WebMCP support.
    if (!isWebMCPSupported()) {
      setState("unsupported");
      return;
    }

    try {
      const result = registerWebMCPTools({
        tools: RECALL_TOOLS,
        fromOrigins: [CHATGPT_AUDIENCE],
      });
      setRegisteredTools(result.registered);
      setState(result.registered.length > 0 ? "registered" : "failed");
      setError(null);

      return () => {
        result.unregister();
      };
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const config = {
    unsupported: {
      label: "WebMCP unavailable",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      title:
        "This browser does not support WebMCP. Open Recall in the ChatGPT in-app browser or Chrome 149+ with chrome://flags/#enable-webmcp-testing to let your agent call tools.",
    },
    registering: {
      label: "Registering tools…",
      className: "border-border/60 bg-muted/40 text-muted-foreground",
      title: "Registering Recall's six WebMCP tools with the browser…",
    },
    registered: {
      label: `${registeredTools.length}/6 tools live`,
      className: "border-primary/30 bg-primary/10 text-primary",
      title: `${registeredTools.length} of 6 WebMCP tools are registered. Your ChatGPT agent can now call: ${registeredTools.join(", ")}.`,
    },
    failed: {
      label: "Registration failed",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      title: error ?? "WebMCP tool registration failed.",
    },
  }[state];

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className={cn("gap-1.5 border px-2.5 py-0.5 text-xs font-medium", config.className)}
        title={config.title}
      >
        <span className="relative flex h-1.5 w-1.5">
          {state === "registered" && (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </>
          )}
          {state === "registering" && (
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          )}
          {state === "unsupported" && (
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          )}
          {state === "failed" && (
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
          )}
        </span>
        {config.label}
      </Badge>
      {state === "registered" && registeredTools.length > 0 && (
        <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:inline">
          {registeredTools.join(" · ")}
        </span>
      )}
    </div>
  );
}
