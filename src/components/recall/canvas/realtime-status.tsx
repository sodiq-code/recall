"use client";

import * as React from "react";
import { Wifi, WifiOff, Loader2, RefreshCw } from "lucide-react";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

/**
 * Recall — realtime connection status indicator.
 *
 * Shows the WebSocket connection state to the realtime mini-service. On
 * Vercel (where the mini-service doesn't run), the connection will fail
 * after a timeout and the indicator transitions to "offline" — the activity
 * feed's polling fallback handles updates in that case.
 *
 * States:
 *   - connecting: attempting to connect (amber, spinner)
 *   - connected: WebSocket is live (green, pulse)
 *   - offline: connection failed after 5s timeout (muted, no spinner)
 *     The activity feed still works via polling; this just means real-time
 *     push isn't available.
 */

type ConnectionState = "connecting" | "connected" | "offline";

export function RealtimeStatus({ compact = false }: { compact?: boolean }) {
  const [state, setState] = React.useState<ConnectionState>("connecting");
  const [reconnects, setReconnects] = React.useState(0);

  React.useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      try {
        const { io } = await import("socket.io-client");
        if (cancelled) return;

        const port =
          process.env.NEXT_PUBLIC_REALTIME_PORT ??
          process.env.REALTIME_PORT ??
          "3003";

        // Connect via the gateway with XTransformPort so Caddy routes it.
        socket = io("/?XTransformPort=" + port, {
          path: "/socket",
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 3000,
        });

        // If the socket doesn't connect within 5 seconds, transition to
        // "offline" — the polling fallback in the ActivityFeed handles updates.
        timeoutId = setTimeout(() => {
          if (!cancelled && socket && !socket.connected) {
            setState("offline");
          }
        }, 5000);

        socket.on("connect", () => {
          if (cancelled) return;
          if (timeoutId) clearTimeout(timeoutId);
          setState("connected");
        });
        socket.on("disconnect", () => {
          if (cancelled) return;
          setState("connecting");
        });
        socket.on("reconnect_attempt", () => {
          if (cancelled) return;
          setState("connecting");
          setReconnects((n) => n + 1);
        });
        socket.on("connect_error", () => {
          if (cancelled) return;
          // Connection error — will retry. If we've retried 5 times, go offline.
          if (reconnects >= 5) {
            setState("offline");
          }
        });
        // Welcome event — the mini-service emits this on connect.
        socket.on("recall:welcome", () => {
          if (cancelled) return;
          if (timeoutId) clearTimeout(timeoutId);
          setState("connected");
        });
      } catch {
        // socket.io-client not loaded, or connection error.
        if (!cancelled) setState("offline");
      }
    }

    connect();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      socket?.disconnect();
    };
  }, []);

  const config = {
    connecting: {
      icon: Loader2,
      label: "Connecting",
      className: "text-amber-500",
      spin: true,
      dotClass: "bg-amber-500",
      borderClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    connected: {
      icon: Wifi,
      label: "Live",
      className: "text-primary",
      spin: false,
      dotClass: "bg-primary",
      borderClass: "border-primary/30 bg-primary/10 text-primary",
    },
    offline: {
      icon: RefreshCw,
      label: "Syncing",
      className: "text-muted-foreground",
      spin: false,
      dotClass: "bg-muted-foreground",
      borderClass: "border-border/60 bg-muted/40 text-muted-foreground",
    },
  }[state];

  const Icon = config.icon;

  const tooltip =
    state === "connected"
      ? "Real-time WebSocket connected — activity feed updates instantly"
      : state === "connecting"
        ? `Connecting to real-time service… (attempt ${reconnects + 1})`
        : "Real-time service offline — activity feed syncs every 2 seconds via polling";

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          config.className,
        )}
        title={tooltip}
      >
        <Icon className={cn("h-3 w-3", config.spin && "animate-spin")} />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.borderClass,
      )}
      title={tooltip}
    >
      <Icon className={cn("h-3 w-3", config.spin && "animate-spin")} />
      <span className="relative flex h-1.5 w-1.5">
        {state === "connected" && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dotClass)} />
          </>
        )}
        {state === "connecting" && (
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dotClass)} />
        )}
        {state === "offline" && (
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dotClass)} />
        )}
      </span>
      {config.label}
    </span>
  );
}
