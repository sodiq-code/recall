"use client";

import * as React from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

/**
 * Recall — realtime connection status indicator.
 *
 * Connects to the WebSocket mini-service (mini-services/realtime/, port 3003)
 * via the gateway: `io("/?XTransformPort=3003")`. Shows a live "connected"
 * badge when the socket is up, a "connecting" state while the socket is
 * opening, and a "disconnected" state when the socket drops (with automatic
 * reconnect).
 *
 * The Day-2 definition of done is "the WebSocket connects" — this component
 * is the visual proof of that. Day 5 wires the actual audit-feed fan-out
 * (broadcasting tool-call events to all open Recall tabs).
 *
 * Per the project rules: the socket.io connection MUST use the
 * `?XTransformPort=<port>` query param so the Caddy gateway routes it to the
 * mini-service. Direct port-based connections are forbidden.
 */

type ConnectionState = "connecting" | "connected" | "disconnected";

export function RealtimeStatus({ compact = false }: { compact?: boolean }) {
  const [state, setState] = React.useState<ConnectionState>("connecting");
  const [reconnects, setReconnects] = React.useState(0);

  React.useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

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
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
          if (!cancelled) setState("connected");
        });
        socket.on("disconnect", () => {
          if (!cancelled) setState("disconnected");
        });
        socket.on("reconnect_attempt", () => {
          if (!cancelled) {
            setState("connecting");
            setReconnects((n) => n + 1);
          }
        });
        // Welcome event — the mini-service emits this on connect.
        socket.on("recall:welcome", () => {
          if (!cancelled) setState("connected");
        });
      } catch (err) {
        // socket.io-client not yet loaded, or connection error.
        if (!cancelled) setState("disconnected");
      }
    }

    connect();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  const config = {
    connecting: {
      icon: Loader2,
      label: "Connecting",
      className: "text-amber-500",
      spin: true,
    },
    connected: {
      icon: Wifi,
      label: "Live",
      className: "text-primary",
      spin: false,
    },
    disconnected: {
      icon: WifiOff,
      label: "Offline",
      className: "text-muted-foreground",
      spin: false,
    },
  }[state];

  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          config.className,
        )}
        title={
          state === "connected"
            ? "WebSocket connected"
            : state === "connecting"
              ? `Connecting… (attempt ${reconnects || 1})`
              : "Disconnected — will retry"
        }
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
        state === "connected"
          ? "border-primary/30 bg-primary/10 text-primary"
          : state === "connecting"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-border/60 bg-muted text-muted-foreground",
      )}
      title={
        state === "connected"
          ? "WebSocket connected to the realtime mini-service"
          : state === "connecting"
            ? `Connecting… (attempt ${reconnects || 1})`
            : "Disconnected — will retry automatically"
      }
    >
      <Icon className={cn("h-3 w-3", config.spin && "animate-spin")} />
      <span className="relative flex h-1.5 w-1.5">
        {state === "connected" && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </>
        )}
        {state === "connecting" && (
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
        )}
        {state === "disconnected" && (
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        )}
      </span>
      {config.label}
    </span>
  );
}
