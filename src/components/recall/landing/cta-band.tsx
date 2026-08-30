import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authConfigured } from "@/lib/env";
import { Reveal } from "./motion-primitives";

/**
 * Recall — closing CTA band.
 *
 * The last thing a reader sees before the footer. Mirrors the hero CTA so a
 * scroll-to-bottom reader still lands on a clear action.
 */
export function CtaBand() {
  const ctaHref = authConfigured ? "/login" : "https://github.com/sodiq-code/recall";
  return (
    <section className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 text-center ring-elevated sm:p-14">
            <div
              aria-hidden
              className="bg-memory-lattice absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Take back the memory your AI keeps on you.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Recall is open source under the MIT License. Clone the repo,
                deploy to Vercel, and point ChatGPT at your own memory vault.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link href={ctaHref}>
                    Connect ChatGPT
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a
                    href="https://github.com/sodiq-code/recall"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Star on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
