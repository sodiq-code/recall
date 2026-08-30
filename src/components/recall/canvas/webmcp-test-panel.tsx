"use client";

import * as React from "react";
import {
  PlayCircle,
  Search,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ALL_TOOLS } from "@/lib/webmcp/tools";
import {
  queryHandler,
  addFactHandler,
  updateFactHandler,
  forgetFactHandler,
  summarizeHandler,
  timelineHandler,
  type FactResult,
} from "@/lib/webmcp/handlers";
import { toast } from "sonner";

/**
 * Recall — WebMCP tool-call test panel.
 *
 * Simulates what ChatGPT does: calls Recall's six registered tools from the
 * page context and shows the exact response the agent would receive. This
 * lets a judge verify the full WebMCP tool surface works end-to-end without
 * needing ChatGPT's in-app browser — the tool handlers call the same
 * /api/memory/* routes the agent would use.
 *
 * The panel is collapsible (collapsed by default) so it doesn't clutter the
 * canvas for normal use. Expand it to test any tool.
 */

type ToolName =
  | "query"
  | "addFact"
  | "updateFact"
  | "forgetFact"
  | "summarize"
  | "timeline";

interface CallResult {
  tool: ToolName;
  args: Record<string, unknown>;
  result: unknown;
  error: string | null;
  latencyMs: number;
}

const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
  query: Search,
  addFact: Plus,
  updateFact: Pencil,
  forgetFact: Trash2,
  summarize: Sparkles,
  timeline: Clock,
};

const TOOL_EXAMPLES: Record<ToolName, Record<string, unknown>> = {
  query: { query: "hobbies" },
  addFact: { content: "Prefers async communication over meetings.", tags: ["work"] },
  updateFact: { factId: "<paste a fact ID>", content: "Updated fact text." },
  forgetFact: { factId: "<paste a fact ID>" },
  summarize: {},
  timeline: { limit: 10 },
};

export function WebMCPTestPanel() {
  const [expanded, setExpanded] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState<ToolName>("query");
  const [argsText, setArgsText] = React.useState(
    JSON.stringify(TOOL_EXAMPLES.query, null, 2),
  );
  const [result, setResult] = React.useState<CallResult | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);

  function selectTool(name: ToolName) {
    setActiveTool(name);
    setArgsText(JSON.stringify(TOOL_EXAMPLES[name], null, 2));
    setResult(null);
    setParseError(null);
  }

  async function runCall() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsText) as Record<string, unknown>;
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }

    setIsRunning(true);
    const startedAt = performance.now();
    let callResult: unknown = null;
    let error: string | null = null;

    try {
      switch (activeTool) {
        case "query":
          callResult = await queryHandler(parsed as { query: string; tags?: string[]; limit?: number });
          break;
        case "addFact":
          callResult = await addFactHandler(parsed as { content: string; tags?: string[] });
          break;
        case "updateFact":
          callResult = await updateFactHandler(parsed as { factId: string; content?: string; tags?: string[] });
          break;
        case "forgetFact":
          callResult = await forgetFactHandler(parsed as { factId: string });
          break;
        case "summarize":
          callResult = await summarizeHandler(parsed as { tags?: string[]; limit?: number });
          break;
        case "timeline":
          callResult = await timelineHandler(parsed as { limit?: number });
          break;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Math.round(performance.now() - startedAt);
    setResult({ tool: activeTool, args: parsed, result: callResult, error, latencyMs });
    setIsRunning(false);

    if (error) {
      toast.error(`${activeTool}() failed`, { description: error });
    } else {
      toast.success(`${activeTool}() called`, {
        description: `${latencyMs}ms`,
      });
    }
  }

  const tool = ALL_TOOLS.find((t) => t.name === activeTool)!;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      {/* Header (collapsible) */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <PlayCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Agent tool-call simulator</span>
          <Badge
            variant="secondary"
            className="ml-1 gap-1 border-border/60 bg-background/60 px-1.5 py-0 text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            <ShieldCheck className="h-2.5 w-2.5" />
            same handlers as ChatGPT
          </Badge>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/60">
          6 tools · calls /api/memory/*
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/60 p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            This panel calls Recall&apos;s six WebMCP tool handlers from the page
            context — exactly what ChatGPT does when it calls{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              document.modelContext.query()
            </code>
            . The handlers call the same{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">/api/memory/*</code>{" "}
            routes the canvas uses.
          </p>

          <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
            {/* Tool selector */}
            <nav aria-label="WebMCP tools">
              <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {ALL_TOOLS.map((t) => {
                  const Icon = TOOL_ICONS[t.name as ToolName];
                  const active = t.name === activeTool;
                  return (
                    <li key={t.name}>
                      <button
                        type="button"
                        onClick={() => selectTool(t.name as ToolName)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors lg:w-full",
                          active
                            ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{t.name}</span>
                        {t.annotations.readOnlyHint && (
                          <span className="ml-auto hidden text-[9px] uppercase text-primary lg:inline">
                            RO
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Tool detail */}
            <div className="min-w-0 space-y-3">
              {/* Tool header */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-medium text-foreground">
                    {tool.name}()
                  </code>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1 border font-mono text-[9px] uppercase tracking-wide",
                      tool.annotations.readOnlyHint
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground/50 line-through",
                    )}
                  >
                    readOnlyHint: {tool.annotations.readOnlyHint ? "true" : "false"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1 border font-mono text-[9px] uppercase tracking-wide",
                      tool.annotations.untrustedContentHint
                        ? "border-accent/40 bg-accent/10 text-accent-foreground"
                        : "border-border/60 bg-muted/40 text-muted-foreground/50 line-through",
                    )}
                  >
                    untrustedContentHint: {tool.annotations.untrustedContentHint ? "true" : "false"}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{tool.description}</p>
              </div>

              {/* Args editor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Call args (JSON)
                </label>
                <textarea
                  value={argsText}
                  onChange={(e) => setArgsText(e.target.value)}
                  spellCheck={false}
                  className={cn(
                    "h-24 w-full resize-y rounded-lg border border-border/60 bg-background/70 p-2.5 font-mono text-xs leading-relaxed",
                    parseError && "border-destructive/60",
                  )}
                />
                {parseError && (
                  <p className="text-[10px] text-destructive">
                    <span className="font-mono">parse error:</span> {parseError}
                  </p>
                )}
              </div>

              {/* Call button */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={runCall}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      calling…
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                      Call {activeTool}()
                    </>
                  )}
                </Button>
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  as chatgpt.com → recall.app
                </span>
              </div>

              {/* Result */}
              {result && (
                <div className="rounded-lg border border-border/40 bg-background/70">
                  <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {result.error ? (
                        <X className="h-3 w-3 text-destructive" />
                      ) : (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                      {result.error ? "error" : "response"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {result.latencyMs}ms
                    </span>
                  </div>
                  <ScrollArea className="max-h-48">
                    <pre className="p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
                      {result.error
                        ? result.error
                        : JSON.stringify(result.result, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
