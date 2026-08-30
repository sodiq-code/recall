import { Reveal } from "./motion-primitives";
import { ToolPlayground } from "@/components/recall/playground/tool-playground";

/**
 * Recall — "try the tools" section on the landing page.
 *
 * Hosts the interactive WebMCP Tool Playground so a visitor can explore the
 * six tools hands-on without leaving the page. Placed after the static
 * six-tools grid so the visitor sees the contract, then gets to *use* it.
 */
export function TryTheTools() {
  return (
    <section className="border-t border-border/60 bg-muted/20 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Try the tools
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Play the agent. Call every tool yourself.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              You don&apos;t need ChatGPT to explore Recall. Pick a tool, edit
              the call args, and see the exact response shape ChatGPT would
              receive — plus the signed audit entry Recall would record.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <ToolPlayground />
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground/70">
            The playground runs against an in-memory demo vault (clearly
            labelled <span className="font-mono">demo: true</span>). No sign-in,
            no persistence, no data leaves your browser.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
