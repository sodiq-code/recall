import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  Activity,
  Settings,
  LogOut,
  Plus,
  ShieldCheck,
  ScrollText,
  Sparkles,
  Clock,
} from "lucide-react";
import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { getSessionUser } from "@/lib/auth/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/recall/landing/motion-primitives";
import { RealtimeStatus } from "@/components/recall/canvas/realtime-status";

/**
 * Recall — /app (the memory canvas).
 *
 * Gated on a valid session. If the user is not signed in, redirect to /login.
 * On first sign-in the canvas is empty — this page shows the welcome card
 * that explains what to do next: add facts, connect ChatGPT, and watch the
 * audit feed.
 *
 * The memory CRUD (cards, inline edit, forget) lands on the next task (Day 3).
 * For now, the welcome card + the audit-feed stub + the realtime connection
 * status satisfy the Day-2 definition of done: "a new user can sign up, see
 * the empty canvas, and the WebSocket connects."
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

          {/* Welcome card */}
          <Reveal delay={0.05}>
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-xl">
              <div
                aria-hidden
                className="bg-memory-lattice absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
              />
              <div className="relative">
                <Badge
                  variant="secondary"
                  className="gap-1.5 border-border/60 bg-background/60 px-2.5 py-0.5 text-xs"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  Welcome to Recall
                </Badge>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Your memory vault is ready.
                </h1>
                <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
                  This is where your ChatGPT agent&apos;s memory of you lives —
                  fully visible, fully editable, fully audited. Add your first
                  facts, then open ChatGPT and ask it what it knows about you.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add a fact
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/playground">
                      <Brain className="mr-1.5 h-4 w-4" />
                      Try the tools
                    </Link>
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/70">
                  Memory CRUD (cards, inline edit, tags) ships in the next
                  task. For now, explore the tool surface in the playground.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Empty canvas + audit feed stub */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Empty memory canvas */}
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    <Brain className="h-4 w-4 text-primary" />
                    Memory canvas
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    0 facts
                  </span>
                </div>
                <div className="bg-memory-lattice flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Brain className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-sm font-medium">No facts yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Add a fact manually, or let your ChatGPT agent add one via
                    the{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">
                      addFact
                    </code>{" "}
                    WebMCP tool.
                  </p>
                  <Button size="sm" variant="outline" className="mt-4">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add your first fact
                  </Button>
                </div>
              </div>
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
                  <Clock className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No agent activity yet
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
                    When ChatGPT calls a Recall tool, the call appears here in
                    real time — signed and reversible.
                  </p>
                </div>
                <div className="mt-4 border-t border-border/40 pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>every entry is signed &amp; reversible</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ScrollText className="h-3.5 w-3.5 text-primary" />
                    <span>audit export available (next tasks)</span>
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
