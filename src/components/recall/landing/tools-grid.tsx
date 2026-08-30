import { ALL_TOOLS } from "@/lib/webmcp/tools";
import { cn } from "@/lib/utils";
import { Reveal, StaggerGroup, StaggerItem, LiftOnHover } from "./motion-primitives";

/**
 * Recall — the six WebMCP tools grid.
 *
 * Renders the canonical tool surface (lib/webmcp/tools) so the page is never
 * out of sync with the code. Each card shows the tool name, its one-line
 * summary, and the WebMCP annotations (readOnlyHint / untrustedContentHint)
 * that govern how the agent may use it.
 */
export function ToolsGrid() {
  return (
    <section className="border-t border-border/60 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              The tool surface
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Six tools your agent can call.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Recall publishes six WebMCP tools through{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                document.modelContext.registerTool()
              </code>
              . Each carries the spec&apos;s annotations so ChatGPT knows whether
              a tool is read-only and whether it accepts untrusted content.
            </p>
          </div>
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_TOOLS.map((tool, i) => (
            <StaggerItem key={tool.name}>
              <LiftOnHover className="group relative h-full overflow-hidden rounded-xl border border-border/60 bg-card/50 p-5 transition-colors hover:border-primary/40 hover:bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 font-mono text-base font-medium text-foreground">
                      {tool.name}()
                    </h3>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Annotation
                      label="read-only"
                      active={tool.annotations.readOnlyHint}
                    />
                    <Annotation
                      label="untrusted"
                      active={tool.annotations.untrustedContentHint}
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {tool.summary}
                </p>
              </LiftOnHover>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function Annotation({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/40 text-muted-foreground/60",
      )}
      title={
        active
          ? `annotation: ${label} = true`
          : `annotation: ${label} = false`
      }
    >
      {label}
    </span>
  );
}
