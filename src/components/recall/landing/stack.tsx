import { Cpu, Database, GitBranch, Layers, Lock, Zap } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem, LiftOnHover } from "./motion-primitives";

/**
 * Recall — engineering stack / sponsor callouts.
 *
 * A compact, honest view of what Recall is built on. Names the open standard
 * (WebMCP) and the frameworks the judges represent (Next.js / Vercel; shadcn),
 * plus the data + security primitives that back the audit trail.
 */
const STACK = [
  {
    icon: Layers,
    name: "Next.js 16",
    role: "App Router · React Server Components",
  },
  {
    icon: Zap,
    name: "WebMCP",
    role: "document.modelContext tool surface",
  },
  {
    icon: Cpu,
    name: "shadcn/ui + Tailwind",
    role: "Accessible, composable primitives",
  },
  {
    icon: Database,
    name: "Prisma",
    role: "Type-safe persistence (SQLite → Postgres)",
  },
  {
    icon: Lock,
    name: "WebCrypto",
    role: "Capability tokens · signed audit log",
  },
  {
    icon: GitBranch,
    name: "GitHub Actions",
    role: "Lint · typecheck · build on every PR",
  },
];

export function Stack() {
  return (
    <section className="border-t border-border/60 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              The stack
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Honest engineering, no buzzword baggage.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              No blockchain, no Kubernetes, no multi-agent orchestration, no RAG
              pipeline in the MVP. Each choice below is justified by the product
              — and each rejected alternative is documented in the README.
            </p>
          </div>
        </Reveal>

        <StaggerGroup
          className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3"
          stagger={0.06}
        >
          {STACK.map((s) => (
            <StaggerItem key={s.name}>
              <LiftOnHover className="flex h-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/70">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.role}
                  </p>
                </div>
              </LiftOnHover>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
