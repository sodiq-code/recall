"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  registerWebMCPTools,
  isWebMCPSupported,
} from "@/lib/webmcp";
import { RECALL_TOOLS } from "@/lib/webmcp/recall-tools";
import { type ToolName } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Recall — WebMCP bridge.
 *
 * Registers Recall's six WebMCP tools with the browser when a signed-in user
 * opens /app. Only the enabled tools are registered — the bridge fetches the
 * user's permission state and filters the tool set. When the user toggles a
 * tool in Settings and returns to /app, the bridge re-registers with the new
 * set.
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

    const toolsToRegister = enabledTools.length > 0
      ? RECALL_TOOLS.filter((t) => enabledTools.includes(t.name as ToolName))
      : RECALL_TOOLS;

    if (toolsToRegister.length === 0) {
      setState("registered");
      setRegisteredCount(0);
      return;
    }

    let cancelled = false;
    setState("registering");

    const result = registerWebMCPTools({ tools: toolsToRegister });

    result.ready
      .then(() => {
        if (cancelled) return;
        setRegisteredCount(toolsToRegister.length);
        setState("registered");
      })
      .catch(() => {
        if (cancelled) return;
        setState("failed");
      });

    return () => {
      cancelled = true;
      result.unregister();
    };
  }, [enabledTools.join(",")]);

  const totalTools = enabledTools.length || 6;
  const config = {
    unsupported: {
      label: "WebMCP unavailable",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      title: "Open in ChatGPT in-app browser or Chrome 149+ with chrome://flags/#enable-webmcp-testing",
    },
    registering: {
      label: "Registering…",
      className: "border-border/60 bg-muted/40 text-muted-foreground",
      title: "Registering tools…",
    },
    registered: {
      label: `${registeredCount}/${totalTools} tools live`,
      className: "border-primary/30 bg-primary/10 text-primary",
      title: `${registeredCount} of ${totalTools} WebMCP tools are registered and available to your agent.`,
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
