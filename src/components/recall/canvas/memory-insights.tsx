"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  User,
  Bot,
  Tag as TagIcon,
  TrendingUp,
  Activity,
  Sparkles,
  Search,
  Plus,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ToolName } from "@/lib/constants";

/**
 * Recall — MemoryInsights.
 *
 * A dashboard panel that visualizes the user's memory vault at a glance:
 *   - Total facts count (big number)
 *   - Source breakdown (you vs agent) with a proportional bar
 *   - Top tags (ranked list with count chips)
 *   - 7-day activity sparkline (fact creation cadence)
 *   - Tool-call distribution (how often each WebMCP tool was invoked)
 *
 * Uses TanStack Query with a 60s stale time — insights don't need to be
 * real-time, but they should refresh when the user returns to the tab.
 */

interface InsightsData {
  totalFacts: number;
  bySource: { user: number; agent: number };
  topTags: { tag: string; count: number }[];
  activityLast7Days: { date: string; count: number }[];
  toolCalls: { toolName: ToolName; count: number }[];
  lastActivityAt: number | null;
}

const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
  query: Search,
  addFact: Plus,
  updateFact: Pencil,
  forgetFact: Trash2,
  summarize: Sparkles,
  timeline: Clock,
};

export function MemoryInsights() {
  const { data, isLoading } = useQuery<InsightsData>({
    queryKey: ["insights"],
    queryFn: async () => {
      const res = await fetch("/api/memory/insights");
      if (!res.ok) throw new Error("Failed to load insights");
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading || !data) {
    return <InsightsSkeleton />;
  }

  const maxDayCount = Math.max(...data.activityLast7Days.map((d) => d.count), 1);
  const maxToolCount = Math.max(...data.toolCalls.map((t) => t.count), 1);
  const sourceTotal = data.bySource.user + data.bySource.agent || 1;
  const userPct = Math.round((data.bySource.user / sourceTotal) * 100);
  const agentPct = 100 - userPct;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          Memory insights
        </h2>
        {data.lastActivityAt && (
          <span className="text-[10px] text-muted-foreground/70">
            last activity {formatRelative(data.lastActivityAt)}
          </span>
        )}
      </div>

      {/* Big total + source breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-background/50 p-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {data.totalFacts}
            </span>
            <span className="text-sm text-muted-foreground">
              {data.totalFacts === 1 ? "fact" : "facts"} in your vault
            </span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted/50">
            <div
              className="bg-primary/70 transition-all duration-500"
              style={{ width: `${userPct}%` }}
              title={`You: ${data.bySource.user}`}
            />
            <div
              className="bg-accent-foreground/60 transition-all duration-500"
              style={{ width: `${agentPct}%` }}
              title={`Agent: ${data.bySource.agent}`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3 text-primary" />
              you · {data.bySource.user} ({userPct}%)
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Bot className="h-3 w-3 text-accent-foreground" />
              agent · {data.bySource.agent} ({agentPct}%)
            </span>
          </div>
        </div>

        {/* 7-day sparkline */}
        <div className="rounded-xl border border-border/40 bg-background/50 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3 w-3" />
              last 7 days
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {data.activityLast7Days.reduce((s, d) => s + d.count, 0)} added
            </span>
          </div>
          <div className="mt-3 flex h-12 items-end justify-between gap-1">
            {data.activityLast7Days.map((day) => (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col items-center justify-end"
                title={`${day.date}: ${day.count} fact${day.count === 1 ? "" : "s"}`}
              >
                <div
                  className={cn(
                    "w-full rounded-sm transition-all duration-300",
                    day.count > 0
                      ? "bg-primary/70 group-hover:bg-primary"
                      : "bg-muted/40",
                  )}
                  style={{
                    height: `${Math.max((day.count / maxDayCount) * 100, 6)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground/60">
            {data.activityLast7Days.map((d) => (
              <span key={d.date} className="flex-1 text-center">
                {new Date(d.date).toLocaleDateString("en", { weekday: "narrow" })}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top tags */}
      {data.topTags.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <TagIcon className="h-3 w-3" />
            top tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.topTags.map((t, i) => (
              <span
                key={t.tag}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
                  i === 0
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground",
                )}
              >
                {t.tag}
                <span className="rounded-full bg-background/60 px-1 text-[9px] tabular-nums text-muted-foreground/70">
                  {t.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tool-call distribution */}
      {data.toolCalls.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Brain className="h-3 w-3" />
            tool calls
          </div>
          <div className="space-y-1.5">
            {data.toolCalls.map((tc) => {
              const Icon = TOOL_ICONS[tc.toolName] ?? Activity;
              const pct = Math.round((tc.count / maxToolCount) * 100);
              return (
                <div key={tc.toolName} className="flex items-center gap-2">
                  <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="w-20 shrink-0 font-mono text-[11px] text-muted-foreground">
                    {tc.toolName}
                  </span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-primary/50 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                    {tc.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.totalFacts === 0 && data.toolCalls.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Brain className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No insights yet — add a fact to start your memory.
          </p>
        </div>
      )}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="mt-4 h-8" />
      <Skeleton className="mt-4 h-20" />
    </div>
  );
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
