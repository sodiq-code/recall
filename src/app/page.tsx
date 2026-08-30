import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { Hero } from "@/components/recall/landing/hero";
import { Problem } from "@/components/recall/landing/problem";
import { Inversion } from "@/components/recall/landing/inversion";
import { ToolsGrid } from "@/components/recall/landing/tools-grid";
import { TryTheTools } from "@/components/recall/landing/try-the-tools";
import { HowItWorks } from "@/components/recall/landing/how-it-works";
import { Stack } from "@/components/recall/landing/stack";
import { CtaBand } from "@/components/recall/landing/cta-band";

/**
 * Recall — landing page (/).
 *
 * The public face of the project. Composes the hero (the inversion + the
 * audit-feed "wow moment"), the problem framing, the core innovation, the
 * six-tool surface, the four-step journey, the stack, and a closing CTA. The
 * wrapper uses min-h-screen + flex-col with the footer pinned via mt-auto so
 * the footer sticks on short viewports and pushes down on long ones.
 *
 * Day 1 scope (blueprint §32): a placeholder landing page is part of the
 * scaffold definition-of-done. This is intentionally more than "hello world"
 * — the landing page is the repo's first impression for judges, so it ships
 * polished from the first commit.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Inversion />
        <ToolsGrid />
        <TryTheTools />
        <HowItWorks />
        <Stack />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
