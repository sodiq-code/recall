"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Search,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Clock,
  RotateCcw,
  ShieldCheck,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";
import type { ToolName } from "@/lib/constants";

/**
 * Recall — ActivityFeed.
 *
 * The real-time audit feed. Shows every agent tool call + every user
 * mutation, newest first.
 *
 * Connectivity strategy (hybrid — works on both local dev and Vercel):
 *   1. WebSocket: attempts to connect to the realtime mini-service. When
 *      connected, events arrive in real-time (~200ms).
 *   2. Polling fallback: if the WebSocket is not connected within 3 seconds,
 *      TanStack Query refetches /api/audit every 2 seconds. This ensures the
 *      feed still updates on Vercel (where the mini-service can't run) or
 *      when the mini-service is down.
 *
 * The userId is fetched from /api/auth/me (not from a DOM attribute) so it's
 * not leaked to anyone inspecting the page source.
 *
 * Rollback: each addFact / forgetFact entry has a "rollback" button.
 * addFact → forget the fact; forgetFact → restore the fact.
 */

interface AuditEntry {
  id: string;
  timestamp: number;
  callerOrigin: string;
  toolName: ToolName;
  args: Record<string, unknown>;
  resultCount: number;
  resultHash: string;
  capabilityTokenId: string | null;
  signature: string;
}

const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
  query: Search,
  addFact: Plus,
  updateFact: Pencil,
  forgetFact: Trash2,
  summarize: Sparkles,
  timeline: Clock,
};

export function ActivityFeed() {
  const queryClient = useQueryClient();
  const [liveEntries, setLiveEntries] = React.useState<AuditEntry[]>([]);
  const wsConnectedRef = React.useRef(false);
  const [polling, setPolling] = React.useState(false);

  // --- Fetch the userId (for WebSocket room join) from the session API ---
  const { data: meData } = useQuery<{ user: { id: string } }>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to load user");
      return res.json();
    },
    staleTime: Infinity, // The userId doesn't change during the session
  });
  const userId = meData?.user.id;

  // --- Fetch audit entries (with polling fallback) ---
  // Poll every 2s ONLY when the WebSocket is not connected. When the WS
  // connects, we stop polling to avoid double-fetching.
  const { data, isLoading } = useQuery<{
    entries: AuditEntry[];
    count: number;
  }>({
    queryKey: ["audit"],
    queryFn: async () => {
      const res = await fetch("/api/audit?limit=50");
      if (!res.ok) throw new Error("Failed to load audit feed");
      return res.json();
    },
    refetchInterval: polling ? 2000 : false,
    refetchOnWindowFocus: true,
  });

  // --- WebSocket: attempt real-time connection ---
  React.useEffect(() => {
    if (!userId) return; // Wait until we have the userId

    let socket: Socket | null = null;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    // If the WebSocket doesn't connect within 3 seconds, start polling.
    pollTimer = setTimeout(() => {
      if (!cancelled && !wsConnectedRef.current) {
        setPolling(true);
      }
    }, 3000);

    async function connect() {
      try {
        const { io } = await import("socket.io-client");
        if (cancelled) return;

        const port = process.env.NEXT_PUBLIC_REALTIME_PORT ?? "3003";
        socket = io("/?XTransformPort=" + port, {
          path: "/socket",
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 1000,
          timeout: 3000,
        });

        socket.on("connect", () => {
          if (cancelled) return;
          wsConnectedRef.current = true;
          setPolling(false); // Stop polling — WS is live
          if (userId) {
            socket?.emit("recall:join", userId);
          }
        });

        socket.on("disconnect", () => {
          if (cancelled) return;
          wsConnectedRef.current = false;
          setPolling(true); // Resume polling on disconnect
        });

        socket.on("recall:audit", (entry: AuditEntry) => {
          if (cancelled) return;
          setLiveEntries((prev) => {
            if (prev.some((e) => e.id === entry.id)) return prev;
            return [entry, ...prev].slice(0, 100);
          });
          queryClient.invalidateQueries({ queryKey: ["audit"] });
        });
      } catch {
        // socket.io-client not loaded — polling fallback handles it
        if (!cancelled) setPolling(true);
      }
    }

    connect();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      socket?.disconnect();
    };
  }, [userId, queryClient]);

  // Merge fetched + live entries (live takes precedence, deduplicated by ID)
  const allEntries = React.useMemo(() => {
    const fetched = data?.entries ?? [];
    const fetchedIds = new Set(fetched.map((e) => e.id));
    const liveOnly = liveEntries.filter((e) => !fetchedIds.has(e.id));
    return [...liveOnly, ...fetched].slice(0, 50);
  }, [data, liveEntries]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Activity feed
        </h2>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="relative flex h-1.5 w-1.5">
            {wsConnectedRef.current ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </>
            ) : (
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            )}
          </span>
          <span className={wsConnectedRef.current ? "text-primary" : "text-amber-500"}>
            {wsConnectedRef.current ? "live" : polling ? "syncing" : "connecting"}
          </span>
        </span>
      </div>

      {isLoading ? (
        <ActivityFeedSkeleton />
      ) : allEntries.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No activity yet
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
            When you add a fact or ChatGPT calls a tool, the action appears
            here — signed and reversible.
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-1.5 pr-1">
            {allEntries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="mt-4 border-t border-border/40 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>every entry is signed &amp; reversible</span>
        </div>
      </div>
    </div>
  );
}

/** Skeleton placeholder for the activity feed while loading. */
function ActivityFeedSkeleton() {
  return (
    <div className="space-y-1.5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
        >
          <Skeleton className="mt-0.5 h-6 w-6 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const Icon = TOOL_ICONS[entry.toolName] ?? Activity;
  const isAgent = entry.callerOrigin !== "recall.app";
  const factId = (entry.args.factId as string) ?? null;

  const canRollback =
    (entry.toolName === "addFact" && factId) ||
    (entry.toolName === "forgetFact" && factId);

  return (
    <div className="group flex items-start gap-2.5 rounded-lg border border-border/40 bg-background/40 px-3 py-2 transition-colors hover:bg-muted/30">
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
          entry.toolName === "addFact"
            ? "border-primary/30 bg-primary/10 text-primary"
            : entry.toolName === "forgetFact"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : entry.toolName === "updateFact"
                ? "border-accent/30 bg-accent/10 text-accent-foreground"
                : "border-border/60 bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {isAgent ? (
              <Bot className="mr-1 inline h-2.5 w-2.5" />
            ) : (
              <User className="mr-1 inline h-2.5 w-2.5" />
            )}
            {entry.callerOrigin} →{" "}
            <span className="text-foreground">recall.app</span>
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground/60">
            {formatRelative(entry.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs">
          <span className="font-medium text-foreground">{entry.toolName}</span>
          <span className="font-mono text-muted-foreground">
            ({summarizeArgs(entry)})
          </span>
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/70">
            {entry.resultCount}{" "}
            {entry.resultCount === 1 ? "item" : "items"}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground/40">
            {entry.resultHash.slice(0, 8)}…
          </span>
          {canRollback && (
            <RollbackButton toolName={entry.toolName} factId={factId!} />
          )}
        </div>
      </div>
    </div>
  );
}

function RollbackButton({
  toolName,
  factId,
}: {
  toolName: ToolName;
  factId: string;
}) {
  const queryClient = useQueryClient();
  const [isRollingBack, setIsRollingBack] = React.useState(false);

  async function handleRollback() {
    setIsRollingBack(true);
    try {
      if (toolName === "addFact") {
        const res = await fetch(`/api/memory/${factId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to rollback");
        toast.success("Rolled back — fact forgotten");
      } else if (toolName === "forgetFact") {
        const res = await fetch(`/api/memory/${factId}/restore`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Failed to rollback");
        toast.success("Rolled back — fact restored");
      }
      queryClient.invalidateQueries({ queryKey: ["facts"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setIsRollingBack(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5"
      onClick={handleRollback}
      disabled={isRollingBack}
      title={
        toolName === "addFact"
          ? "Forget the fact that was added"
          : "Restore the fact that was forgotten"
      }
    >
      <RotateCcw className="h-3 w-3" />
      {isRollingBack ? "rolling back…" : "rollback"}
    </Button>
  );
}

function summarizeArgs(entry: AuditEntry): string {
  const args = entry.args;
  if (entry.toolName === "query" && args.query) {
    return `"${String(args.query).slice(0, 40)}"`;
  }
  if (entry.toolName === "addFact" && args.content) {
    return `"${String(args.content).slice(0, 40)}"`;
  }
  if (entry.toolName === "updateFact" && args.factId) {
    return `${String(args.factId).slice(0, 8)}…`;
  }
  if (entry.toolName === "forgetFact" && args.factId) {
    return `${String(args.factId).slice(0, 8)}…`;
  }
  if (entry.toolName === "summarize") {
    return "top-N summary";
  }
  if (entry.toolName === "timeline") {
    return "recent actions";
  }
  return JSON.stringify(args).slice(0, 40);
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
