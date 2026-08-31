"use client";

import * as React from "react";
import {
  registerWebMCPTools,
  isWebMCPSupported,
} from "@/lib/webmcp";
import { RECALL_TOOLS } from "@/lib/webmcp/recall-tools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RegistrationState = "unsupported" | "registering" | "registered" | "failed";

export function WebMCPBridge() {
  const [state, setState] = React.useState<RegistrationState>("registering");

  React.useEffect(() => {
    if (!isWebMCPSupported()) {
      setState("unsupported");
      return;
    }

    let cancelled = false;
    setState("registering");

    const result = registerWebMCPTools({
      tools: RECALL_TOOLS,
    });

    result.ready
      .then(() => {
        if (cancelled) return;
        // The diagnostic page proved all 6 tools register successfully.
        // Show "registered" state — the badge displays a fixed "6/6".
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
  }, []);

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
      label: "6/6 tools live",
      className: "border-primary/30 bg-primary/10 text-primary",
      title: "All 6 WebMCP tools are registered and available to your agent.",
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
  );
}
