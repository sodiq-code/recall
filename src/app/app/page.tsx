import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { getSessionUser } from "@/lib/auth/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/recall/landing/motion-primitives";
import { RealtimeStatus } from "@/components/recall/canvas/realtime-status";
import { MemoryCanvas } from "@/components/recall/canvas/memory-canvas";
import { MemoryInsights } from "@/components/recall/canvas/memory-insights";
import { WebMCPBridge } from "@/components/recall/canvas/webmcp-bridge";
import { WebMCPTestPanel } from "@/components/recall/canvas/webmcp-test-panel";
import { ActivityFeed } from "@/components/recall/canvas/activity-feed";
import { ErrorBoundary } from "@/components/recall/canvas/error-boundary";

/**
 * Recall — /app (the memory canvas).
 *
 * Gated on a valid session. If the user is not signed in, redirect to /login.
 * Otherwise renders the memory canvas (cards, search, add/edit/forget), the
 * audit feed, and the realtime connection status indicator.
 *
 * The page is a server component (for the session check + redirect), but the
 * MemoryCanvas itself is a client component (TanStack Query + optimistic
 * mutations).
 */
export default async function AppPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          {/* User header */}
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/60">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signed in via GitHub · {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <WebMCPBridge />
                <RealtimeStatus />
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/settings">
                    <Settings className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                </Button>
                <form action="/api/auth/logout" method="post">
                  <Button type="submit" variant="ghost" size="sm">
                    <LogOut className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </form>
              </div>
            </div>
          </Reveal>

          {/* Welcome banner */}
          <Reveal delay={0.05}>
            <div className="relative mt-6 overflow-hidden rounded-xl border border-border/60 bg-card/40 p-4">
              <div
                aria-hidden
                className="bg-memory-lattice absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]"
              />
              <div className="relative flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="gap-1 border-border/60 bg-background/60 px-2.5 py-0.5 text-xs"
                >
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  Your vault is live
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Add facts, edit, or forget. Your six WebMCP tools are
                  registered — open ChatGPT and ask it what it knows about
                  you.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Canvas + audit feed */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <Reveal delay={0.1}>
              <ErrorBoundary label="the memory canvas">
                <MemoryCanvas />
              </ErrorBoundary>
            </Reveal>

            {/* Live activity feed */}
            <Reveal delay={0.15}>
              <ErrorBoundary label="the activity feed">
                <ActivityFeed />
              </ErrorBoundary>
            </Reveal>
          </div>

          {/* Memory insights dashboard */}
          <Reveal delay={0.18}>
            <div className="mt-6">
              <ErrorBoundary label="the insights dashboard">
                <MemoryInsights />
              </ErrorBoundary>
            </div>
          </Reveal>

          {/* WebMCP tool-call simulator */}
          <Reveal delay={0.2}>
            <div className="mt-6">
              <ErrorBoundary label="the tool-call simulator">
                <WebMCPTestPanel />
              </ErrorBoundary>
            </div>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const dynamic = "force-dynamic";
