import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { ToolPlayground } from "@/components/recall/playground/tool-playground";
import { Reveal } from "@/components/recall/landing/motion-primitives";

/**
 * Recall — /playground (dedicated interactive playground).
 *
 * The Tool Playground also appears inline on the landing page; this route is
 * the direct-linkable, distraction-free version. A judge who wants to test
 * the WebMCP tool surface without scrolling lands here.
 */
export default function PlaygroundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <Reveal>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Recall
            </Link>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              WebMCP Tool Playground
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Recall publishes six WebMCP tools. This playground lets you call
              each one against an in-memory demo vault — the same response
              shape ChatGPT would receive, with the same audit-trail provenance.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <ToolPlayground />
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
