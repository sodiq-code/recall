import { Activity, ArrowDownRight, ShieldCheck, Search, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion-primitives";

/**
 * Recall — audit-feed preview (static).
 *
 * A faithful mock of the live activity feed that shows real-time updates. It renders the
 * "wow moment" of the demo: ChatGPT calls query(&quot;hobbies&quot;) → Recall returns
 * three facts → the entry appears in the feed in real time. Today it is a
 * static illustration of the product's payoff; the live feed swaps it for
 * WebSocket-backed live feed.
 *
 * Polish notes:
 *   - The live entry carries the `glow-activity` class so its amber glow
 *     pulses subtly (defined in globals.css with prefers-reduced-motion
 *     fallback).
 *   - Each tool gets a crisp lucide icon (Search / Plus / Pencil / Trash2)
 *     rather than a fallback letter, so the feed reads at a glance.
 *   - The whole card elevates with `ring-elevated` for a premium halo around
 *     the hero moment.
 */
type FeedEntry = {
  callerOrigin: string;
  tool: "query" | "addFact" | "updateFact" | "forgetFact";
  args: string;
  result: string;
  ago: string;
  live?: boolean;
};

const FEED: FeedEntry[] = [
  {
    callerOrigin: "chatgpt.com",
    tool: "query",
    args: "hobbies",
    result: "returned 3 facts",
    ago: "just now",
    live: true,
  },
  {
    callerOrigin: "chatgpt.com",
    tool: "addFact",
    args: "Prefers morning meetings",
    result: "fact added",
    ago: "2m ago",
  },
  {
    callerOrigin: "chatgpt.com",
    tool: "forgetFact",
    args: "outdated project note",
    result: "soft-deleted · reversible",
    ago: "11m ago",
  },
  {
    callerOrigin: "recall.app",
    tool: "updateFact",
    args: "Speaks English + Yoruba",
    result: "fact updated",
    ago: "1h ago",
  },
];

function ToolIcon({ tool }: { tool: FeedEntry["tool"] }) {
  switch (tool) {
    case "query":
      return <Search className="h-3.5 w-3.5" />;
    case "addFact":
      return <ArrowDownRight className="h-3.5 w-3.5" />;
    case "updateFact":
      return <Pencil className="h-3.5 w-3.5" />;
    case "forgetFact":
      return <Trash2 className="h-3.5 w-3.5" />;
  }
}

export function AuditFeedPreview() {
  return (
    <Reveal className="relative w-full max-w-md" delay={0.05}>
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/20 ring-elevated backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Activity feed</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            live
          </span>
        </div>

        <div className="bg-memory-lattice max-h-[22rem] divide-y divide-border/40 overflow-y-auto">
          {FEED.map((entry, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                entry.live && "glow-activity bg-accent/[0.07]",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                  entry.tool === "addFact"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : entry.tool === "forgetFact"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : entry.tool === "updateFact"
                        ? "border-accent/40 bg-accent/10 text-accent-foreground"
                        : "border-border/60 bg-muted text-muted-foreground",
                )}
              >
                <ToolIcon tool={entry.tool} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {entry.callerOrigin} →{" "}
                    <span className="text-foreground">recall.app</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground/70">
                    {entry.ago}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm">
                  <span className="font-medium text-foreground">
                    {entry.tool}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    ({entry.args})
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.result}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-primary" />
            every entry is signed &amp; reversible
          </span>
          <span className="font-mono">JWS-verified</span>
        </div>
      </div>
    </Reveal>
  );
}
