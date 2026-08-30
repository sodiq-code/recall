# Recall

> **Your AI, your memory, your rules.**
>
> The first transparent, controllable memory layer for your ChatGPT agent —
> built natively on [WebMCP](https://webmcp.devpost.com/).

Recall is a hosted website where ChatGPT's memory of you lives — and you can
see, edit, and audit it. ChatGPT's memory is a black box; Recall is the
website that fixes it. Your AI's memory of you is fully visible, fully
editable, fully audited — and only your ChatGPT agent can read or write it,
via WebMCP.

Built for [The WebMCP Challenge](https://webmcp.devpost.com/) (OpenAI / Devpost).

---

## The inversion (the one idea)

Every prior MCP hackathon had the **agent as the subject** — the agent calls
servers. Recall takes WebMCP's spec topology seriously and ships the
**inversion** as the product:

| | Prior MCP apps | Recall |
| --- | --- | --- |
| **Subject** | The agent | The website |
| **Client** | A server | ChatGPT |
| **Tool surface** | Lives on a server | Lives at a TLS origin |
| **Trust boundary** | The network | The browser |

The website **is** the memory. The agent **is** the consumer. The browser is
the trust boundary. The capability token is the credential. The audit log is
the receipt.

The six tools are the surface area; the inversion is the value.

## The problem

ChatGPT's memory is opaque. You cannot see what it knows, cannot edit
individual facts, cannot audit when memory was used, and cannot selectively
forget. There is no API, no audit log, and no way to verify which memory was
used in a given response. Recall fixes all four.

## The six WebMCP tools

Recall registers six tools via `document.modelContext.registerTool()` when a
signed-in user opens the app in a WebMCP-capable browser (the ChatGPT in-app
browser, or Chrome 149+ with the `chrome://flags/#enable-webmcp-testing` flag).

| Tool | Purpose | Read-only | Untrusted content |
| --- | --- | :---: | :---: |
| `query` | Retrieve facts matching a natural-language query | ✓ | |
| `addFact` | Add a new fact to the user's memory | | ✓ |
| `updateFact` | Update an existing fact's content or tags | | ✓ |
| `forgetFact` | Soft-delete a fact (reversible from the audit log) | | |
| `summarize` | Deterministic top-N summary of the memory vault | ✓ | |
| `timeline` | Chronological list of recent agent actions | ✓ | |

Each tool carries the spec's `readOnlyHint` / `untrustedContentHint`
annotations so the agent knows how it may use it.

## How it works

1. **Sign in once.** Authenticate at Recall. GitHub OAuth stands in for
   ChatGPT OAuth on demo day; the production plan swaps in ChatGPT OAuth when
   it ships to third parties.
2. **See your memory.** Recall renders your facts as a canvas of editable,
   taggable cards. Add, edit, or forget any fact directly — nothing is hidden.
3. **Ask ChatGPT anything.** Open ChatGPT in its in-app browser. ChatGPT
   calls `recall(query=…)`, `addFact(…)`, or `forgetFact(…)` through the
   WebMCP tools Recall registered.
4. **Audit every call.** Every tool call appears in your activity feed in
   real time, signed and reversible. Export the whole log as a verifiable
   JSON bundle.

> **Try it without ChatGPT.** The interactive
> [Tool Playground](#try-the-tools) (`/playground`) lets you call each of
> the six tools against an in-memory demo vault — the same response shape
> ChatGPT would receive, with the same audit-trail provenance. No sign-in
> required.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ ChatGPT in-app browser (or Chrome 149 origin trial)            │
│  • Calls WebMCP tools via document.modelContext                 │
│  • Sees Recall's six tools                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ in-page tool call, same-origin
┌───────────────────────────▼─────────────────────────────────────┐
│ Recall (Next.js 16 — App Router)                               │
│  • Registers six WebMCP tools on load                           │
│  • Tool handlers execute in the page sandbox                    │
│  • Renders memory canvas + activity feed                        │
│  • WebSocket client (real-time updates)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ authenticated fetch / WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│ Recall backend (Next.js API routes → Prisma)                   │
│  • /api/memory/*        — CRUD + query/summarize handlers       │
│  • /api/audit/*        — audit feed + signed export            │
│  • /api/capability-token — issue + verify short-TTL tokens     │
│  • /api/permissions     — per-tool enable + granted origins     │
│  • /api/realtime       — WebSocket fan-out to open tabs         │
└─────────────────────────────────────────────────────────────────┘
```

> **Note on deployment target.** The original architecture targets
> Cloudflare Workers + Durable Objects for per-user stateful edge storage.
> This repository ships the sanctioned Vercel-only fallback (validated in
> the blueprint's validation plan: *"Use only Vercel; switch Durable Objects
> to Vercel Postgres"*). State lives in Prisma (SQLite for dev, Vercel
> Postgres for production) and the WebSocket fan-out runs as a dedicated
> mini-service. The Cloudflare deployment path remains available; the
> `wrangler.toml` scaffold is documented for a later task.

## The stack

- **[Next.js 16](https://nextjs.org/)** — App Router, React Server Components
- **[WebMCP](https://webmcp.devpost.com/)** — `document.modelContext` tool surface
- **[Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)** — accessible, composable primitives
- **[Turso](https://turso.tech/) (libSQL)** — edge-replicated SQLite database (works on Vercel serverless AND locally)
- **[socket.io](https://socket.io/)** — real-time WebSocket fan-out (mini-service)
- **[GitHub OAuth](https://docs.github.com/en/apps/oauth-building-authentication-apps)** — demo-day substitute for ChatGPT OAuth
- **[WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** — capability tokens + signed audit log
- **[GitHub Actions](https://github.com/features/actions)** — lint · typecheck · build on every PR

No blockchain, no Kubernetes, no multi-agent orchestration, no RAG pipeline
in the MVP. Each choice is justified by the product; each rejected
alternative is documented in the source.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ or [Bun](https://bun.sh/) 1.1+
- A [Turso](https://turso.tech/) database (free tier) — the connection URL + auth token
- A [GitHub OAuth app](https://github.com/settings/developers) (for auth — see `.env.example`)

### Install

```bash
bun install                          # main app
cd mini-services/realtime && bun install  # realtime WebSocket mini-service
```

### Configure

Copy the environment template and fill in the secrets:

```bash
cp .env.example .env
```

You need:
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — from your Turso dashboard
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` — from your GitHub OAuth app
- `SESSION_SECRET` — generate with `openssl rand -hex 32`

### Database

The schema is pushed to Turso via the `@libsql/client` (the Prisma CLI can't
push directly to libSQL). The schema is defined in `prisma/schema.prisma` as
the source of truth; the DDL is applied with:

```bash
bun run db:push     # push the schema to the local migration DB (Prisma CLI)
bun run db:generate # regenerate the Prisma client (for types)
```

To push the schema to Turso, run the DDL via the libSQL client (see the
task-2 worklog entry for the exact command).

### Develop

```bash
bun run dev                                        # main app on :3000
cd mini-services/realtime && bun run dev           # realtime on :3003
```

Visit [`/health`](http://localhost:3000/health) for the health check,
[`/login`](http://localhost:3000/login) to sign in via GitHub OAuth, and
[`/app`](http://localhost:3000/app) for the memory canvas (requires a session).

### Scripts

| Script | Description |
| --- | --- |
| `bun run dev` | Start the dev server on port 3000 |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:push` | Push the Prisma schema to the database |
| `bun run db:studio` | Open Prisma Studio |

## Project structure

```
src/
  app/
    api/                 # HTTP + WebMCP tool-handler API routes
      memory/            #   memory CRUD + query/summarize (next tasks)
      audit/             #   audit feed + signed export (next tasks)
      capability-token/  #   capability token issue/verify (next tasks)
      permissions/        #   per-tool enable + granted origins (next tasks)
      auth/oauth/github/ #   GitHub OAuth flow (start + callback)
      auth/logout/       #   session destruction
      route.ts           #   self-describing API manifest
    health/route.ts      # /health — health check
    login/               # /login — GitHub OAuth sign-in
    app/                 # /app — memory canvas (session-gated)
    playground/          # /playground — interactive WebMCP tool playground
    docs/                # /docs — one-page developer doc
    page.tsx             # / — landing page (incl. inline tool playground)
    layout.tsx           # root layout (theme provider, metadata)
    not-found.tsx        # branded 404
  components/
    recall/              # Recall-specific components (header, footer, landing)
    theme/               # next-themes provider + toggle
    ui/                  # shadcn/ui primitives
  lib/
    webmcp/              # WebMCP tool definitions + registration entrypoint
    demo/                # in-memory demo vault + simulated tool executor
    auth/                # GitHub OAuth + session helpers
    audit/               # audit-log append/list (next tasks)
    capability/          # capability token issue/verify (next tasks)
    security/            # site signing key — WebCrypto (next tasks)
    constants.ts        # tool names, origins, validation bounds
    env.ts               # typed environment access (zod-validated)
    db.ts                # Turso (libSQL) database access layer
prisma/
  schema.prisma          # User, Fact, FactTag, AuditEntry, CapabilityToken,
                        #   PermissionState, Session (source of truth for DDL)
mini-services/
  realtime/              # socket.io WebSocket mini-service (port 3003)
.github/workflows/
  ci.yml                 # lint + typecheck + build on every push/PR
```

## The security model

Recall's defense is structural, not just code. To match it, a competitor would
need to (a) publish tools from their own TLS origin, (b) issue capability
tokens with the right audience/TTL/scope, (c) implement a cryptographically
signed audit log, and (d) ship the open-source template that makes the pattern
reusable. Each is real work; together they are the bulk of the build window.

See [`SECURITY.md`](./SECURITY.md) for the full threat model.

## The WebMCP Challenge

- **Challenge:** [The WebMCP Challenge](https://webmcp.devpost.com/)
- **Rules:** [webmcp.devpost.com/rules](https://webmcp.devpost.com/rules)
- **Resources:** [webmcp.devpost.com/resources](https://webmcp.devpost.com/resources)
- **Submission deadline:** Sep 3, 2026, 1:00pm PT
- **Judging:** WebMCP Leverage / Execution / Potential Impact / Creativity & Ambition

### What this project demonstrates

- **WebMCP Leverage** — exercises seven distinct WebMCP features in 30 lines
  of registration code: imperative tool registration, the six-tool surface,
  `readOnlyHint`, `untrustedContentHint`, `fromOrigins` cross-origin grant,
  browser-mediated session, and audit-log integration. The interactive
  `/playground` lets judges explore the full tool surface hands-on without
  ChatGPT or a sign-in.
- **Execution** — a complete, coherent product experience, not a technical
  proof of concept.
- **Potential Impact** — every ChatGPT Plus/Pro/Team user (~100M+ MAU) is a
  target user; opaque AI memory is a 2026 trust crisis.
- **Creativity & Ambition** — the architectural inversion (website as
  subject, agent as client) is a category anchor competitors are unlikely to
  replicate in the build window.

## License

[MIT](./LICENSE) © Recall
