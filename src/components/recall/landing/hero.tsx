import Link from "next/link";
import { ArrowRight, ShieldCheck, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditFeedPreview } from "./audit-feed-preview";
import { Reveal } from "./motion-primitives";

/**
 * Recall — landing hero.
 *
 * Owns the first impression. The headline states the inversion (the website
 * is the memory; the agent is the client). The audit-feed preview on the
 * right is the "wow moment" rendered statically — it shows exactly what the
 * user sees the moment ChatGPT calls a Recall tool. It updates in real time.
 *
 * Polish:
 *   - The two-line headline renders the gradient on the second line ("your
 *     rules."), anchored on a left margin so the gradient line aligns under
 *     the first line at every breakpoint.
 *   - The WebMCP badge keeps its emerald ping; the audit-feed preview's live
 *     entry carries the pulsing amber glow (defined in globals.css).
 *   - The headline + lede + CTA stack fade-up on enter via <Reveal> with a
 *     small stagger so the hero assembles in one calm beat.
 */
export function Hero({ loggedIn = false }: { loggedIn?: boolean }) {
  const ctaHref = loggedIn ? "/app" : "/login";
  const ctaLabel = loggedIn ? "Go to canvas" : "Connect ChatGPT";

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-memory-lattice absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="flex flex-col justify-center">
          <Reveal>
            <Badge
              variant="secondary"
              className="w-fit gap-1.5 border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Built natively on WebMCP
            </Badge>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">Your AI, your memory,</span>
              <span className="mt-1 block bg-gradient-to-br from-primary via-primary to-accent/80 bg-clip-text text-transparent">
                your rules.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              ChatGPT&apos;s memory is a black box. Recall is the website that
              fixes it: your AI&apos;s memory of you — fully visible, fully
              editable, fully audited. Only your ChatGPT agent can read or write
              it, via WebMCP.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com/sodiq-code/recall"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  View the source
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-6">
              <Stat label="WebMCP tools" value="6" />
              <Stat label="Agent LLMs" value="0" hint="ChatGPT is the agent" />
              <Stat label="Audit-trail" value="Signed" hint="JWS-verified" />
            </dl>
          </Reveal>
        </div>

        <div className="flex items-center justify-center">
          <AuditFeedPreview />
        </div>
      </div>

      <Reveal delay={0.1}>
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Browser-mediated · origin-scoped · capability-token authenticated
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </dd>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p>
      )}
    </div>
  );
}
