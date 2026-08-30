import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { getSessionUser } from "@/lib/auth/session";
import { Reveal } from "@/components/recall/landing/motion-primitives";
import { SettingsClient } from "@/components/recall/canvas/settings-client";

/**
 * Recall — /app/settings.
 *
 * The per-tool permission controls + granted-origins management + capability-
 * token issuance. Session-gated: if the user is not signed in, redirect to
 * /login.
 */
export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <Reveal>
            <Link
              href="/app"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to canvas
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Control which tools your agent can call, which origins are granted
              access, and issue capability tokens.
            </p>
          </Reveal>

          <Reveal delay={0.05} className="mt-8">
            <SettingsClient />
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const dynamic = "force-dynamic";
