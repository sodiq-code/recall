import { Globe, Bot, ShieldCheck, ScrollText } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem, LiftOnHover } from "./motion-primitives";

/**
 * Recall — "the inversion" section.
 *
 * The single mechanism that makes Recall fundamentally different (blueprint
 * §17). Every prior MCP hackathon had the agent as the subject — the agent
 * calls servers. Recall takes WebMCP's spec topology seriously: the website
 * publishes the tools, the agent (ChatGPT) is the consumer, the browser is
 * the trust boundary. This is the one paragraph a judge remembers.
 */
const PILLARS = [
  {
    icon: Globe,
    title: "The website is the source of truth.",
    body: "Recall IS the memory — not a view onto a server-side store. Your facts live at a TLS origin you control.",
  },
  {
    icon: Bot,
    title: "The agent is the client.",
    body: "ChatGPT calls Recall's tools through the browser. Recall runs zero LLMs of its own — no second model to fail on demo day.",
  },
  {
    icon: ShieldCheck,
    title: "The browser is the trust boundary.",
    body: "Tool calls are mediated by the page's existing sandbox and scoped to recall.app's origin. Capability tokens authenticate every call.",
  },
  {
    icon: ScrollText,
    title: "The audit log is the receipt.",
    body: "Every agent action is appended to a signed, exportable log. Any claim ChatGPT makes about your memory is checkable.",
  },
];

export function Inversion() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-muted/30 py-20 sm:py-24">
      <div
        aria-hidden
        className="bg-memory-lattice absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-primary">
                The core innovation
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                The website is the subject. The agent is the client.
              </h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
                Most submissions measure innovation by counting features. Recall
                measures it by inverting a topology — and ships the inversion as
                the product. The six tools are the surface area; the inversion is
                the value.
              </p>
              <div className="mt-6 rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur">
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  <span className="text-primary">ChatGPT</span>
                  <span className="text-muted-foreground/60"> → </span>
                  <span className="text-foreground">document.modelContext</span>
                  <span className="text-muted-foreground/60">.registerTool</span>
                  <span className="text-muted-foreground/60">(</span>
                  <span className="text-foreground">{"{ ... }"}</span>
                  <span className="text-muted-foreground/60">)</span>
                  <br />
                  <span className="text-muted-foreground/60">
                    {"// fromOrigins: ['https://chatgpt.com']"}
                  </span>
                </p>
              </div>
            </div>
          </Reveal>

          <StaggerGroup className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <StaggerItem key={p.title}>
                <LiftOnHover className="h-full rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur transition-colors hover:border-primary/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <p.icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-4 text-base font-medium">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </LiftOnHover>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
}
