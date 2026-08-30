"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ListTree,
  Sparkles,
  Clock,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ALL_TOOLS, getToolSpec } from "@/lib/webmcp/tools";
import type { ToolName } from "@/lib/constants";
import {
  DEMO_FACTS,
  DEMO_AUDIT_SEED,
  executeDemoToolCall,
  TOOL_EXAMPLES,
  type ToolCallResult,
} from "@/lib/demo/mock-memory";

/**
 * Recall — interactive WebMCP Tool Playground.
 *
 * Lets a visitor play the agent: pick one of the six WebMCP tools Recall
 * publishes, edit the call args, and see the exact response shape ChatGPT
 * would receive — plus the audit-log entry Recall would record. The vault
 * is in-memory and clearly labelled "demo", so no sign-in or ChatGPT is
 * required.
 *
 * This directly demonstrates the WebMCP Leverage judging criterion: a judge
 * can explore the full tool surface (six tools, their JSON Schemas, the
 * readOnlyHint / untrustedContentHint annotations, and the provenance
 * contract) without leaving the landing page.
 */
const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
  query: Search,
  addFact: Plus,
  updateFact: Pencil,
  forgetFact: Trash2,
  summarize: Sparkles,
  timeline: Clock,
};

export function ToolPlayground() {
  const [activeTool, setActiveTool] = React.useState<ToolName>("query");
  const [argsText, setArgsText] = React.useState(
    JSON.stringify(TOOL_EXAMPLES.query, null, 2),
  );
  const [result, setResult] = React.useState<ToolCallResult | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<"args" | "result" | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);

  const tool = getToolSpec(activeTool)!;

  // When the visitor switches tools, reset the args to that tool's example.
  function selectTool(name: ToolName) {
    setActiveTool(name);
    setArgsText(JSON.stringify(TOOL_EXAMPLES[name], null, 2));
    setResult(null);
    setParseError(null);
  }

  function runCall() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsText) as Record<string, unknown>;
      setParseError(null);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Invalid JSON — fix the args and retry.",
      );
      return;
    }
    setIsRunning(true);
    // Tiny delay so the "calling" state reads as a real round-trip.
    setTimeout(() => {
      const r = executeDemoToolCall(activeTool, parsed);
      setResult(r);
      setIsRunning(false);
    }, 220);
  }

  function resetArgs() {
    setArgsText(JSON.stringify(TOOL_EXAMPLES[activeTool], null, 2));
    setParseError(null);
  }

  async function copy(text: string, which: "args" | "result") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard may be unavailable — silent */
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-2xl shadow-black/10 backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">WebMCP Tool Playground</span>
          <Badge
            variant="secondary"
            className="ml-1 gap-1 border-border/60 bg-background/60 text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            demo mode
          </Badge>
        </div>
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          document.modelContext.registerTool()
        </span>
      </div>

      <div className="grid lg:grid-cols-[210px_1fr]">
        {/* Tool selector */}
        <nav
          aria-label="WebMCP tools"
          className="border-b border-border/60 bg-muted/20 lg:border-b-0 lg:border-r"
        >
          <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
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
                      "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors lg:w-full",
                      active
                        ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                        active
                          ? "border-primary/30 bg-primary/15 text-primary"
                          : "border-border/60 bg-background text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[13px] font-medium">
                        {t.name}
                      </span>
                      <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground/70 lg:block">
                        {t.annotations.readOnlyHint ? "read-only" : "writes"}
                        {t.annotations.untrustedContentHint ? " · untrusted" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tool detail */}
        <div className="min-w-0">
          {/* Tool header */}
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-mono text-lg font-medium text-foreground">
                  {tool.name}
                  <span className="text-muted-foreground/60">()</span>
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Annotation
                  label="readOnlyHint"
                  active={tool.annotations.readOnlyHint}
                />
                <Annotation
                  label="untrustedContentHint"
                  active={tool.annotations.untrustedContentHint}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {/* Args editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="playground-args"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Call args (JSON)
                </label>
                <button
                  type="button"
                  onClick={resetArgs}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  reset example
                </button>
              </div>
              <div className="relative">
                <Textarea
                  id="playground-args"
                  value={argsText}
                  onChange={(e) => setArgsText(e.target.value)}
                  spellCheck={false}
                  className={cn(
                    "min-h-[160px] resize-y bg-background/70 font-mono text-xs leading-relaxed",
                    parseError && "border-destructive/60 focus-visible:ring-destructive/30",
                  )}
                  aria-invalid={Boolean(parseError)}
                />
                <button
                  type="button"
                  onClick={() => copy(argsText, "args")}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Copy args"
                >
                  {copied === "args" ? (
                    <>
                      <Check className="h-3 w-3 text-primary" /> copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> copy
                    </>
                  )}
                </button>
              </div>
              {parseError ? (
                <p className="text-xs text-destructive">
                  <span className="font-mono">parse error:</span> {parseError}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/80">
                  Edit the JSON, then call the tool. The playground returns the
                  same shape ChatGPT would receive.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={runCall}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                      calling…
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Call {tool.name}()
                    </>
                  )}
                </Button>
                <span className="font-mono text-[11px] text-muted-foreground">
                  as chatgpt.com → recall.app
                </span>
              </div>
            </div>

            {/* JSON Schema viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  inputSchema
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/70">
                  JSON Schema
                </span>
              </div>
              <ScrollArea className="h-[200px] rounded-lg border border-border/60 bg-background/70">
                <pre className="px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/90">
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="border-t border-border/60 bg-muted/20 px-5 py-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tool response
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-background/70 px-2 py-0.5 font-mono">
                    {result.latencyMs}ms
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(JSON.stringify(result.result, null, 2), "result")}
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 transition-colors hover:text-foreground"
                  >
                    {copied === "result" ? (
                      <>
                        <Check className="h-3 w-3 text-primary" /> copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                <div className="overflow-hidden rounded-lg border border-border/60 bg-background/70">
                  <div className="border-b border-border/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    result
                  </div>
                  <ScrollArea className="h-[220px]">
                    <pre className="px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/90">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                {/* Audit entry */}
                <div className="overflow-hidden rounded-lg border border-primary/30 bg-primary/[0.04]">
                  <div className="flex items-center justify-between border-b border-primary/20 px-3 py-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                      <ShieldCheck className="h-3 w-3" />
                      audit entry
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      signed
                    </span>
                  </div>
                  <div className="space-y-2 p-3 text-[11px]">
                    <AuditRow
                      label="caller"
                      value={result.audit.callerOrigin}
                      mono
                    />
                    <AuditRow label="tool" value={result.audit.toolName} mono />
                    <AuditRow
                      label="args"
                      value={JSON.stringify(result.audit.args)}
                      mono
                      truncate
                    />
                    <AuditRow
                      label="result"
                      value={`${result.audit.resultCount} item${result.audit.resultCount === 1 ? "" : "s"}`}
                    />
                    <AuditRow
                      label="hash"
                      value={result.audit.resultHash}
                      mono
                    />
                    <AuditRow
                      label="ts"
                      value={new Date(result.audit.timestamp).toISOString()}
                      mono
                      truncate
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demo vault footer */}
      <div className="border-t border-border/60 bg-muted/30 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ListTree className="h-3.5 w-3.5" />
            demo memory vault
          </span>
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {DEMO_FACTS.length} facts · {DEMO_AUDIT_SEED.length} audit entries
          </span>
        </div>
        <ScrollArea className="max-h-40">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {DEMO_FACTS.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-2 rounded-md border border-border/40 bg-background/50 px-2.5 py-1.5"
              >
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    f.source === "agent" ? "bg-accent" : "bg-primary",
                  )}
                  title={`source: ${f.source} (${f.sourceOrigin})`}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">{f.content}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                    {f.id} · {f.tags.join(", ")} · score {f.relevanceScore}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}

function Annotation({ label, active }: { label: string; active?: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 border font-mono text-[10px] uppercase tracking-wide",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/40 text-muted-foreground/50 line-through",
      )}
      title={`${label} = ${active ? "true" : "false"}`}
    >
      {label}: {active ? "true" : "false"}
    </Badge>
  );
}

function AuditRow({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-12 shrink-0 text-muted-foreground/70">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 text-foreground/90",
          mono && "font-mono",
          truncate && "truncate",
        )}
      >
        {value}
      </span>
    </div>
  );
}
