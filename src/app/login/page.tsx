import Link from "next/link";
import { redirect } from "next/navigation";
import { Github, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { RecallMark } from "@/components/recall/recall-mark";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { authConfigured } from "@/lib/env";

/**
 * Recall — /login.
 *
 * The sign-in page. A single primary action: "Continue with GitHub". The
 * button hits /api/auth/oauth/github which starts the GitHub OAuth flow.
 *
 * GitHub OAuth is the substitute
 * for ChatGPT OAuth. The note is
 * shown directly on the page so judges understand the trade-off. The
 * production plan swaps in ChatGPT OAuth when it ships to third parties.
 *
 * Error handling: if GitHub redirected back with ?error=..., we show a
 * friendly message explaining the failure. This is a server component so we
 * read the search params from the URL.
 *
 * Dev mode: when GitHub OAuth is not configured, the page auto-redirects to
 * /app where a demo user is auto-provisioned.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Dev mode: no OAuth configured — skip straight to the app.
  if (!authConfigured) {
    redirect("/app");
  }
  // If already logged in, go straight to the canvas
  const user = await getSessionUser();
  if (user) redirect("/app");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recall
          </Link>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <RecallMark className="mb-4" />
              <h1 className="text-2xl font-semibold tracking-tight">
                Connect your agent
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to Recall to let your ChatGPT agent read and write your
                memory vault — with full audit and control.
              </p>

              <form
                action="/api/auth/oauth/github"
                method="get"
                className="mt-8 w-full"
              >
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                >
                  <Github className="mr-2 h-5 w-5" />
                  Continue with GitHub
                </Button>
              </form>

              <ErrorBanner searchParams={searchParams} />

              <div className="mt-8 w-full space-y-2 border-t border-border/60 pt-6 text-left">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Your session is an opaque, httpOnly cookie. We never see
                    your GitHub password; the access token is used once to
                    fetch your profile, then discarded.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>
                    <strong className="text-foreground">
                      About authentication:
                    </strong>{" "}
                    Recall uses GitHub OAuth for sign-in. Direct ChatGPT OAuth
                    for third-party apps is on the roadmap — once available,
                    Recall will offer a native ChatGPT connection alongside
                    GitHub.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Show a friendly error message if the OAuth flow failed. */
async function ErrorBanner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;

  const messages: Record<string, string> = {
    missing_params: "The sign-in request was missing required parameters.",
    invalid_state:
      "The sign-in state didn't match. This can happen if you waited too long — please try again.",
    token_exchange_failed:
      "We couldn't exchange the authorization code with GitHub. Please try again.",
    user_fetch_failed:
      "We couldn't fetch your GitHub profile. Please try again.",
    access_denied: "You declined the GitHub authorization. No worries — try again anytime.",
  };

  const message = messages[error] ?? `Sign-in failed: ${error}`;

  return (
    <div className="mt-4 w-full rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}
