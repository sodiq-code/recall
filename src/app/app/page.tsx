import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Settings,
  LogOut,
  ShieldCheck,
  ScrollText,
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

/**
 * Recall — /app (the memory canvas).
 *
 * Gated on a valid session. If the user is not signed in, redirect to /login.
 * Otherwise renders the memory canvas (cards, search, add/edit/forget), the
 * audit feed stub, and the realtime connection status indicator.
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
                  Add facts, edit, or forget — your agent can&apos;t see them
                  until you open ChatGPT and grant it access.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Canvas + audit feed */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <Reveal delay={0.1}>
              <MemoryCanvas />
            </Reveal>

            {/* Audit feed stub */}
            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-4 w-4 text-primary" />
                    Activity feed
                  </h2>
                  <RealtimeStatus compact />
                </div>
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Agent activity appears here
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
                    When ChatGPT calls a Recall tool, the call shows up here in
                    real time — signed and reversible. Your manual edits show
                    up too.
                  </p>
                </div>
                <div className="mt-4 border-t border-border/40 pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>every entry is signed &amp; reversible</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const dynamic = "force-dynamic";
