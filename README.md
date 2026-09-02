# Recall

[![Live Demo](https://img.shields.io/badge/live-recall--app--one.vercel.app-success?style=flat-square)](https://recall-app-one.vercel.app)
[![Demo Video](https://img.shields.io/badge/demo-YouTube-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://youtu.be/Wyy71D72m3s)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![WebMCP](https://img.shields.io/badge/WebMCP-6A4C93?style=flat-square)](https://webmcp.devpost.com)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Turso](https://img.shields.io/badge/Turso-libSQL-0099CC?style=flat-square)](https://turso.tech)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-6C63FF?style=flat-square)](./LICENSE)

> **Instead of giving an agent access to your memory, Recall gives your
> memory a controlled interface the agent must use.**

Recall is a user-controlled memory layer for AI agents, implemented as a
WebMCP website. Instead of making memory an opaque capability of the agent,
Recall makes memory a web capability the user can inspect, edit, audit, and
revoke.

**Live app:** [recall-app-one.vercel.app](https://recall-app-one.vercel.app)
**Demo video:** [youtu.be/Wyy71D72m3s](https://youtu.be/Wyy71D72m3s) (2:16)

---

## The problem

AI agents need persistent memory. But today, agent memory is **opaque and
platform-controlled**. You cannot see what ChatGPT knows about you, cannot
edit individual facts, cannot audit when memory was used, and cannot
selectively forget. There is no API, no audit log, and no way to verify which
memory was used in a given response.

## The insight

**Make memory a website.**

Recall takes WebMCP's spec topology seriously and ships the **inversion** as
the product. Most MCP architectures put the agent at the center: the agent
calls servers. Recall inverts that relationship — the website is the
subject, the agent is the consumer:

| | Prior MCP apps | Recall |
| --- | --- | --- |
| **Subject** | The agent | The website |
| **Client** | A server | ChatGPT |
| **Tool surface** | Lives on a server | Lives at a TLS origin |
| **Trust boundary** | The network | The browser |
| **Who owns the memory** | The agent platform | **The user** |

The website **is** the memory. The agent **is** the consumer. The browser is
the trust boundary. The capability token is the authorization credential. The
audit log is the receipt. The user remains in control of every capability.

## See WebMCP working

The full agent ↔ website relationship, end-to-end:

1. **Open Recall** in the ChatGPT in-app browser (or Chrome 149+ with the
   `chrome://flags/#enable-webmcp-testing` flag).
2. **Sign in** with GitHub OAuth.
3. **ChatGPT discovers six tools** Recall registered via
   `document.modelContext.registerTool()`.
4. **Ask ChatGPT** to remember something — e.g. *"Remember that I prefer
   TypeScript."*
5. **Watch Recall update live** — the new fact appears in your memory canvas
   in real time via WebSocket.
6. **Inspect the signed audit event** — every tool call is appended to an
   immutable, ECDSA-signed audit log.
7. **Disable the `addFact` tool** in Settings → the capability token's scope
   is narrowed.
8. **Ask ChatGPT to remember again** → the call is rejected. The agent
   cannot invoke a tool the user has disabled. Re-enable it to restore
   access.

This demonstrates agent capability combined with user governance.

> **Try it without ChatGPT.** The interactive
> [Tool Playground](https://recall-app-one.vercel.app/playground) (`/playground`)
> and the in-app **Agent tool-call simulator** (on `/app`) let you call each
> of the six tools against your real memory vault — the same response shape
> ChatGPT would receive, with the same audit-trail provenance. The
> [`/webmcp-test`](https://recall-app-one.vercel.app/webmcp-test) page shows
> the raw tool registration diagnostics.

## What makes Recall different

### 1. Memory Insights dashboard

Recall renders a dashboard that visualizes your memory vault at a glance:
total facts, source breakdown (you vs agent), top tags, a 7-day activity
sparkline, and per-tool call distribution. This is the same data ChatGPT
sees — made visible to the human who owns it.

### 2. Search with graceful fallback

The `query` tool searches both fact content **and** tags (OR condition). When
there's no match, Recall returns your most recent facts with a clear note —
*"No facts match 'hobbies'. Showing your 5 most recent facts."* The agent
never receives an empty result.

### 3. Cryptographically verifiable audit

Every agent action produces a signed record. The flow:

```
tool call → signed event (ECDSA P-256) → immutable audit record
         → exportable as JWS bundle → independently verifiable without the database
```

The audit log is the receipt you verify ChatGPT's claims against. Export it
from `/app/settings` and verify the signature with the included public key —
no trust in the database required.

### 4. Per-tool permission controls

Disable any tool in Settings. The capability token's scope is narrowed —
the agent cannot invoke a tool the user has disabled. Re-enable it to
restore access. This is WebMCP as **user governance over agent capability**.

## The six WebMCP tools

Recall registers six tools via `document.modelContext.registerTool()` when a
signed-in user opens the app in a WebMCP-capable browser.

| Tool | Purpose | Read-only | Untrusted content |
| --- | --- | :---: | :---: |
| `query` | Retrieve facts matching a natural-language query + tag search | ✓ | |
| `addFact` | Add a new fact to the user's memory | | ✓ |
| `updateFact` | Update an existing fact's content or tags | | ✓ |
| `forgetFact` | Soft-delete a fact (reversible from the audit log) | | |
| `summarize` | Deterministic top-N summary of the memory vault | ✓ | |
| `timeline` | Chronological list of recent agent actions | ✓ | |

Each tool carries the spec's `readOnlyHint` / `untrustedContentHint`
annotations so the agent knows how it may use it.

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
│ Recall backend (Next.js API routes → Turso)                    │
│  • /api/memory/*        — CRUD + query/summarize handlers       │
│  • /api/audit/*        — audit feed + signed export            │
│  • /api/capability-token — issue + verify short-TTL tokens     │
│  • /api/permissions     — per-tool enable + granted origins     │
│  • /api/realtime       — WebSocket fan-out to open tabs         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Realtime mini-service (mini-services/realtime/, port 3003)     │
│  • socket.io with per-user rooms                                 │
│  • HTTP /emit endpoint (backend fan-in)                         │
│  • Broadcasts audit events to all open Recall tabs               │
└─────────────────────────────────────────────────────────────────┘
```

> **Note on deployment target.** The original architecture targets
> Cloudflare Workers + Durable Objects for per-user stateful edge storage.
> This repository ships the Vercel-only fallback. State lives in Turso
> (libSQL); the WebSocket fan-out runs as a dedicated mini-service.

## The stack

- **[Next.js 16](https://nextjs.org/)** — App Router, React Server Components
- **[WebMCP](https://webmcp.devpost.com/)** — `document.modelContext` tool surface
- **[Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)** — accessible, composable primitives
- **[Turso](https://turso.tech/) (libSQL)** — edge-replicated SQLite database (works on Vercel serverless AND locally)
- **[socket.io](https://socket.io/)** — real-time WebSocket fan-out (mini-service)
- **[GitHub OAuth](https://docs.github.com/en/apps/oauth-building-authentication-apps)** — sign-in (native ChatGPT OAuth on the roadmap)
- **[WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** — capability tokens + signed audit log
- **[TanStack Query](https://tanstack.com/query/latest)** — client-side data fetching with optimistic updates
- **[GitHub Actions](https://github.com/features/actions)** — lint · typecheck · build on every PR

No blockchain, no Kubernetes, no multi-agent orchestration, no RAG pipeline
in the MVP. Each choice is justified by the product; each rejected
alternative is documented in the source.

## The security model

Recall's defense is **structural**, not just code. The trust model is anchored
to the WebMCP spec topology: a website publishes its own state as a tool
surface, and an external agent client (ChatGPT) is granted browser-mediated,
origin-scoped, capability-token-authenticated, audit-logged access to read and
write that state.

| Boundary | What it enforces |
| --- | --- |
| **TLS origin** | Tools are published only from the site's own TLS origin. An attacker cannot impersonate the origin without the private key. |
| **Browser sandbox** | Tool handlers execute in the page's existing sandbox. There is no out-of-band channel to the backend. |
| **`fromOrigins` grant** | Tools are exposed only to the agent origins the user grants (default: `https://chatgpt.com`). |
| **Capability token** | Every tool call presents a short-TTL (60–300s), audience-restricted, scope-limited token signed with the user's site key. |
| **Per-tool permissions** | The user can disable any of the six tools. The WebMCP bridge only registers enabled tools; capability tokens are scoped to the enabled set. |
| **Audit log** | Every call is appended to an immutable, signed log. The user can export and verify it independently of the database. |

See [`SECURITY.md`](./SECURITY.md) for the full threat model.

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

The schema is defined in `prisma/schema.prisma` as the source of truth. Push
it to your local migration DB and to Turso:

```bash
bun run db:push     # push the schema to the local migration DB (Prisma CLI)
bun run db:generate # regenerate the Prisma client (for types)
```

To push the schema to Turso, use the `@libsql/client` to apply the DDL (the
Prisma CLI can't push directly to libSQL). The `scripts/seed.ts` file shows
the pattern — it uses `createClient({ url, authToken })` and executes raw
`CREATE TABLE` statements.

### Develop

```bash
bun run dev                                        # main app on :3000
cd mini-services/realtime && bun run dev           # realtime on :3003
```

Visit:
- [`/`](http://localhost:3000/) — landing page + tool playground
- [`/login`](http://localhost:3000/login) — sign in via GitHub OAuth
- [`/app`](http://localhost:3000/app) — memory canvas + activity feed (requires session)
- [`/app/settings`](http://localhost:3000/app/settings) — permissions + tokens + audit export
- [`/playground`](http://localhost:3000/playground) — interactive WebMCP tool playground
- [`/docs`](http://localhost:3000/docs) — one-page developer doc
- [`/health`](http://localhost:3000/health) — health check
- [`/api`](http://localhost:3000/api) — self-describing API manifest

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
      memory/            #   memory CRUD + query/summarize/tags/restore
      audit/             #   audit feed + signed JWS export
      capability-token/  #   capability token issue/verify
      permissions/        #   per-tool enable + granted origins
      auth/oauth/github/ #   GitHub OAuth flow (start + callback)
      auth/logout/       #   session destruction
      route.ts           #   self-describing API manifest
    health/route.ts      # /health — health check
    login/               # /login — GitHub OAuth sign-in
    app/                 # /app — memory canvas + activity feed (session-gated)
    app/settings/        # /app/settings — permissions + tokens + audit export
    playground/          # /playground — interactive WebMCP tool playground
    docs/                # /docs — one-page developer doc
    page.tsx             # / — landing page (incl. inline tool playground)
    layout.tsx           # root layout (theme provider, query provider, metadata)
    not-found.tsx        # branded 404
  components/
    recall/              # Recall-specific components (header, footer, landing, canvas)
    theme/               # next-themes provider + toggle
    ui/                  # shadcn/ui primitives
  lib/
    webmcp/              # WebMCP tool definitions + handlers + registration
    demo/                # in-memory demo vault + simulated tool executor
    auth/                # GitHub OAuth + session + API auth helpers
    audit/               # audit-log append/list + signed JWS export
    capability/          # capability token issue/verify (WebCrypto-signed)
    permissions/         # per-tool enable + granted origins
    security/            # site signing key — WebCrypto ECDSA P-256
    realtime/            # notify helper (backend → mini-service fan-in)
    memory/              # memory data-access layer (CRUD + query + summarize)
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

## Technical highlights

### WebMCP features exercised

- Imperative tool registration (`document.modelContext.registerTool()`)
- Six-tool surface with `readOnlyHint` / `untrustedContentHint` annotations
- `fromOrigins` cross-origin grant via `Permissions-Policy: tools=(self https://chatgpt.com)`
- Browser-mediated session reuse
- Audit-log integration
- Capability-token authentication (short-TTL, ECDSA-signed, scope-limited)
- Declarative form annotation (`data-mcp-tool` attribute on the add-fact form)

### Product completeness

Sign-up, memory canvas with CRUD + tag search + fallback, Memory Insights
dashboard, real-time activity feed with WebSocket fan-out, per-tool
permissions with live capability-token scoping, signed audit export as JWS,
and a settings page — all in one repository, deployed and live.

### Architecture and impact

The architectural inversion (website as subject, agent as client) gives
Recall a distinct position: the website becomes the memory boundary, while
the agent becomes the consumer. ChatGPT users are the initial target market;
the broader opportunity is any conversational AI agent that needs persistent,
user-trusted memory. As AI agents take more autonomous actions, regulators
are moving toward auditability requirements (e.g. the EU AI Act's
transparency obligations for high-risk AI systems).

## License

[MIT](./LICENSE) © Recall
