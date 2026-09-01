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
import { getSessionUser } from "@/lib/auth/session";

/**
 * Recall — landing page (/).
 *
 * Session-aware: passes the `loggedIn` prop to the Hero and CtaBand
 * components so the CTA shows "Go to canvas" when the user is signed in
 * and "Connect ChatGPT" when they're signed out.
 */
export default async function LandingPage() {
  const user = await getSessionUser();
  const loggedIn = Boolean(user);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero loggedIn={loggedIn} />
        <Problem />
        <Inversion />
        <ToolsGrid />
        <TryTheTools />
        <HowItWorks />
        <Stack />
        <CtaBand loggedIn={loggedIn} />
      </main>
      <SiteFooter />
    </div>
  );
}
