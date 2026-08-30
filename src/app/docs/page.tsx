import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Lock, PlayCircle, ScrollText } from "lucide-react";
import { SiteHeader } from "@/components/recall/site-header";
import { SiteFooter } from "@/components/recall/site-footer";
import { ALL_TOOLS } from "@/lib/webmcp/tools";
import { APP_VERSION } from "@/lib/constants";

/**
 * Recall — /docs (single-page developer doc).
 *
 * A concise reference for the tool surface, the security model, and the
 * runtime. Intentionally one page: the canonical reference is the README and
 * the WebMCP spec; this page is the fast on-ramp for a judge or contributor.
 */
export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>Documentation</span>
            <span className="font-mono text-xs">v{APP_VERSION}</span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Recall, in one page.
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Recall is a hosted website that publishes your memory as a WebMCP
            tool surface. Your ChatGPT agent reads and writes that memory
            through the browser — origin-scoped, capability-token
            authenticated, and fully audited.
          </p>

          <section className="mt-12 space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-medium">
              <PlayCircle className="h-5 w-5 text-primary" />
              Try the tools
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The interactive{" "}
              <Link
                href="/playground"
                className="font-medium text-primary hover:underline"
              >
                WebMCP Tool Playground
              </Link>{" "}
              lets you call each of the six tools against an in-memory demo
              vault — the same response shape ChatGPT would receive, with the
              same audit-trail provenance. No sign-in required; no data leaves
              your browser.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-medium">
              <Code2 className="h-5 w-5 text-primary" />
              The tool surface
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Recall registers six tools via{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                document.modelContext.registerTool()
              </code>{" "}
              when a signed-in user opens the app in a WebMCP-capable browser
              (ChatGPT in-app browser, or Chrome 149+ with the origin-trial
              flag). Each tool is annotated per the WebMCP spec.
            </p>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tool</th>
                    <th className="px-4 py-2.5 font-medium">Read-only</th>
                    <th className="px-4 py-2.5 font-medium">Untrusted content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ALL_TOOLS.map((t) => (
                    <tr key={t.name}>
                      <td className="px-4 py-2.5 font-mono">{t.name}</td>
                      <td className="px-4 py-2.5">
                        {t.annotations.readOnlyHint ? "yes" : "no"}
                      </td>
                      <td className="px-4 py-2.5">
                        {t.annotations.untrustedContentHint ? "yes" : "no"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-medium">
              <Lock className="h-5 w-5 text-primary" />
              The security model
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">Browser-mediated.</strong>{" "}
                Tool handlers execute in the page&apos;s existing sandbox;
                there is no out-of-band channel.
              </li>
              <li>
                <strong className="text-foreground">Origin-scoped.</strong>{" "}
                Tools are exposed only to the agent origins the user grants
                (default:{" "}
                <code className="font-mono text-xs">https://chatgpt.com</code>).
              </li>
              <li>
                <strong className="text-foreground">
                  Capability-token authenticated.
                </strong>{" "}
                Every tool call presents a short-TTL, audience-restricted,
                scope-limited token signed with the user&apos;s site key.
              </li>
              <li>
                <strong className="text-foreground">Audit-logged.</strong>{" "}
                Every call is appended to an immutable, signed log; the user can
                export and verify it independently of the database.
              </li>
            </ul>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-medium">
              <ScrollText className="h-5 w-5 text-primary" />
              The runtime
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Recall runs zero LLMs of its own. The agent is ChatGPT — already
              running in the user&apos;s browser. Recall&apos;s job is to
              publish the right tools with the right schemas; ChatGPT does the
              reasoning, the tool selection, and the synthesis. This keeps the
              demo reliable (no second model to fail) and the cost zero.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The HTTP API lives at{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                /api
              </code>{" "}
              and is self-describing. The health check lives at{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                /health
              </code>
              .
            </p>
          </section>

          <div className="mt-12 rounded-xl border border-border/60 bg-muted/30 p-5">
            <p className="text-sm text-muted-foreground">
              The full architecture, the day-by-day build log, and the rejected
              alternatives are documented in the repository README.
            </p>
            <Link
              href="https://github.com/sodiq-code/recall"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Read the README
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
