"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  registerWebMCPTools,
  isWebMCPSupported,
} from "@/lib/webmcp";
import { RECALL_TOOLS } from "@/lib/webmcp/recall-tools";
import { CHATGPT_AUDIENCE, type ToolName } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Recall — WebMCP bridge.
 *
 * Registers Recall's six WebMCP tools with the browser when a signed-in user
 * opens /app. Only the ENABLED tools are registered — the bridge fetches the
 * user's permission state and filters the tool set. When the user toggles a
 * tool in Settings and returns to /app, the bridge re-registers with the new
 * set.
 *
 * The `fromOrigins` grant defaults to `['https://chatgpt.com']` — the ChatGPT
 * in-app browser origin.
 *
 * When the browser does NOT support WebMCP, the component shows a "not
 * available" badge.
 */

type RegistrationState = "unsupported" | "registering" | "registered" | "failed";

interface PermissionState {
  userId: string;
  enabledTools: ToolName[];
  grantedOrigins: string[];
  updatedAt: number;
}

export function WebMCPBridge() {
  const [state, setState] = React.useState<RegistrationState>("registering");
  const [registeredCount, setRegisteredCount] = React.useState(0);

  // Fetch the user's permission state so we only register enabled tools.
  const { data: permData } = useQuery<{ state: PermissionState }>({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await fetch("/api/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  const enabledTools = permData?.state?.enabledTools ?? [];

  React.useEffect(() => {
    if (!isWebMCPSupported()) {
      setState("unsupported");
      return;
    }

    // Filter the tool set to only enabled tools.
    const toolsToRegister = enabledTools.length > 0
      ? RECALL_TOOLS.filter((t) => enabledTools.includes(t.name as ToolName))
      : RECALL_TOOLS; // Default to all if permissions not loaded yet

    if (toolsToRegister.length === 0) {
      setState("registered");
      setRegisteredCount(0);
      return;
    }

    let cancelled = false;
    let unregisterFn: (() => void) | null = null;

    // registerWebMCPTools is async — it awaits all registerTool() promises.
    setState("registering");

    registerWebMCPTools({
      tools: toolsToRegister,
      fromOrigins: [CHATGPT_AUDIENCE],
    })
      .then((result) => {
        if (cancelled) return;
        setRegisteredCount(result.registered.length);
        setState(result.registered.length > 0 ? "registered" : "failed");
        unregisterFn = result.unregister;
      })
      .catch(() => {
        if (cancelled) return;
        setState("failed");
      });

    return () => {
      cancelled = true;
      unregisterFn?.();
    };
  }, [enabledTools.join(",")]); // Re-register when the enabled set changes

  const config = {
    unsupported: {
      label: "WebMCP unavailable",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      title:
        "This browser does not support WebMCP. Open Recall in the ChatGPT in-app browser or Chrome 149+ with chrome://flags/#enable-webmcp-testing.",
    },
    registering: {
      label: "Registering…",
      className: "border-border/60 bg-muted/40 text-muted-foreground",
      title: "Registering tools…",
    },
    registered: {
      label: `${registeredCount}/${enabledTools.length || 6} tools live`,
      className: "border-primary/30 bg-primary/10 text-primary",
      title: `${registeredCount} of ${enabledTools.length || 6} WebMCP tools are registered.`,
    },
    failed: {
      label: "Registration failed",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      title: "WebMCP tool registration failed.",
    },
  }[state];

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 border px-2.5 py-0.5 text-xs font-medium", config.className)}
      title={config.title}
    >
      <span className="relative flex h-1.5 w-1.5">
        {state === "registered" && registeredCount > 0 && (
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
        {state === "registered" && registeredCount === 0 && (
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        )}
      </span>
      {config.label}
    </Badge>
  );
}
