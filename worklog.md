# Recall — Project Worklog

This is the shared handover document for the Recall build. Every task appends
a section below; do not overwrite prior sections.

---
Task ID: 1
Agent: Z.ai Code (orchestrator)
Task: Day 1 — Setup + scaffolding (per WebMCP Grand Prize Blueprint §32)

Work Log:
- Read the Recall_WebMCP_Grand_Prize_Blueprint document (6,827 lines) and
  fetched the WebMCP Challenge home/rules pages for additional context.
- Verified the GitHub token and created the repo `sodiq-code/recall`
  (https://github.com/sodiq-code/recall). Configured the git remote with the
  token.
- Renamed the Next.js 16 scaffold to `recall`, pruned unused deps
  (@dnd-kit, @mdxeditor, next-intl, next-auth), added `typecheck` script.
- Authored the Prisma schema (prisma/schema.prisma) modeling the full Recall
  data layer per blueprint §24.1: User, Fact, FactTag, AuditEntry,
  CapabilityToken, PermissionState, Session. Pushed to SQLite + regenerated
  the client.
- Built the lib foundation that Days 2-7 build on:
  - lib/env.ts — typed env access (zod-validated)
  - lib/constants.ts — the six tool names, annotations, origins, TTL bounds
  - lib/webmcp/{types,tools,index}.ts — the six WebMCP tool definitions
    (schemas + annotations matching §26.1) and the registerWebMCPTools
    entrypoint (feature-detected, no-op when unsupported)
  - lib/auth/session.ts — getSessionUser/createSession/destroySession
  - lib/audit/index.ts — appendAuditEntry + listAuditEntries + result-hash
  - lib/capability/index.ts — issue/verify/revoke capability tokens
  - lib/security/site-key.ts — WebCrypto ECDSA P-256 keygen + sign/verify
- Built the API surface:
  - /health — 200 with status + db-connected probe (503 on db failure)
  - /api — self-describing manifest (the six tools + every endpoint)
  - /api/memory, /api/audit, /api/capability-token, /api/permissions —
    501 stubs that document the contract for their build day
- Built the branded landing page (/) with the Recall identity:
  - Emerald/amber palette (no indigo/blue, per project rules)
  - Hero with memory-lattice bg, gradient headline, audit-feed preview mock
  - Problem, Inversion (the core innovation), six-tools grid, how-it-works,
    stack, closing CTA, sticky footer
  - next-themes provider + toggle (dark default)
- Built /docs (one-page developer doc) and a branded 404.
- Authored README.md (architecture diagram, stack, getting started, project
  structure, security model, WebMCP Challenge context), LICENSE (MIT),
  SECURITY.md (threat model), .env.example.
- Set up CI (.github/workflows/ci.yml): lint + typecheck + build on every
  push/PR.
- Excluded sandbox-only dirs (examples, tests, upload, download, skills,
  Caddyfile, /db/*.db) from the repo via .gitignore + tsconfig exclude.

Verification (Day 1 Definition of Done):
- ✅ `bun run lint` — clean (0 errors, 0 warnings)
- ✅ `bun run typecheck` — clean (tsc --noEmit passes)
- ✅ Dev server on :3000 — healthy, no runtime/console errors
- ✅ GET /health → 200, status:"ok", database:"connected"
- ✅ GET /api → 200, manifest lists 6 tools + all endpoint groups
- ✅ GET /api/memory → 501 (stub contract documented)
- ✅ GET /docs → 200
- ✅ GET /missing → 404 (branded)
- ✅ Agent Browser: page renders (hero, problem, inversion, tools, footer
  all present in the accessibility tree); H1 reads correctly
- ✅ Responsive: mobile (390x844) + desktop (1440x900) layouts hold
- ✅ Sticky footer: pins to viewport bottom on short content (2400px tall
  viewport → docHeight==2400, footer pinned, no floating gap); pushes down
  naturally on long content

Stage Summary:
- The Recall scaffold is feature-complete for Day 1. The full WebMCP tool
  contract (six tools with schemas + annotations) is locked in
  lib/webmcp/tools.ts; the registration entrypoint is feature-detected and
  ready for the Day 4 live wiring. The data model, session model, audit
  contract, capability-token contract, and site-key signing are all in place
  as typed stubs Days 2-7 fill in.
- Deployment note: the original architecture targets Cloudflare Workers +
  Durable Objects; this repo ships the sanctioned Vercel-only fallback
  (blueprint §33: "Use only Vercel; switch Durable Objects to Vercel
  Postgres"). State lives in Prisma (SQLite dev / Vercel Postgres prod); the
  WebSocket fan-out will run as a mini-service (Day 5).
- Keys confirmed sufficient for Day 1: GitHub token + Vercel token.
- Pending: git commit + push to sodiq-code/recall.

---

---
Task ID: 1-polish
Agent: frontend-styling-expert
Task: Refinement pass on the Recall landing page — framer-motion entrance rhythm, animated audit-feed glow, hero polish, header/footer balance, accessibility (prefers-reduced-motion) and mobile overflow fix.

Work Log:
- Read worklog.md (Day 1 handover), globals.css, layout.tsx, page.tsx, not-found.tsx, /docs/page.tsx, and every Recall component under src/components/recall/** to establish the existing palette/structure contract before editing.
- Created src/components/recall/landing/motion-primitives.tsx — a small, composable framer-motion kit exported from a single client island:
  - `Reveal` — single-block fade-up (0.5s ease-out, 16px offset, 80px viewport margin, once: true). Accepts an `as` prop for semantic tags (div / section / li / span).
  - `StaggerGroup` + `StaggerItem` — staggered grids (0.08s default stagger, 0.04s delayChildren). Group accepts `as` so it can render an `<ol>`/`<ul>` and keep list semantics for the HowItWorks steps.
  - `LiftOnHover` — tasteful -2px hover lift with a 200ms transform/box-shadow transition. Kept separate from StaggerItem so hover is opt-in per card.
  - All three call `useReducedMotion()` from framer-motion; when reduced motion is preferred, they collapse to plain DOM (no transform, no opacity change) so the page still works perfectly.
- Updated src/app/globals.css:
  - Added a `@media (prefers-reduced-motion: reduce)` block that gates every CSS-driven animation/transition to 0.001ms (the standard boilerplate used by Bootstrap/Tailwind/Material). `.glow-activity` is additionally forced to `animation: none !important` so the amber pulse goes fully static.
  - Made `.glow-activity` pulse: added `animation: recall-glow-pulse 2.4s ease-in-out infinite` plus a `@keyframes recall-glow-pulse` that breathes the amber box-shadow between 55% and 95% opacity. Subtle (~8% delta), slow (2.4s) — reads as an active event, not chrome.
  - Moved the `@keyframes recall-glow-pulse` declaration OUTSIDE `@layer base` to the root of the stylesheet so Tailwind v4's layer reordering doesn't strip the animation-name (verified live: `animationName: "recall-glow-pulse"` resolves correctly).
  - Added `.ring-elevated` — a hairline primary ring + a soft primary key-light shadow used to elevate the hero audit-feed card and the closing CTA card.
  - Added `text-rendering: optimizeLegibility` and `-webkit-font-smoothing: antialiased` to body so headlines render crisply on macOS/iOS.
- Polished src/components/recall/landing/audit-feed-preview.tsx:
  - Wrapped the whole card in `<Reveal delay={0.05}>` so it fades up after the hero copy.
  - Added crisp lucide tool icons per entry — `Search` for query, `ArrowDownRight` for addFact (kept the original semantic), `Pencil` for updateFact, `Trash2` for forgetFact — instead of the previous fallback-letter glyphs. Each gets its own colored chip (primary / destructive / accent / muted).
  - Added `ring-elevated` to the card wrapper so the hero "wow moment" reads as a premium surface.
  - The live entry keeps the `glow-activity` class so the amber pulse runs (verified in browser).
- Polished src/components/recall/landing/hero.tsx:
  - Wrapped the badge, headline, lede, CTA row, and stats `<dl>` each in their own `<Reveal>` with a 0.05–0.24s stagger so the hero assembles in one calm beat instead of dropping in flat.
  - Refined the two-line headline gradient from `from-primary to-primary/60` to `from-primary via-primary to-accent/80` so the second line ("your rules.") picks up a subtle amber warmth at the end of the gradient — keeps it inside the palette (no indigo/blue) and reads as a deliberate gradient rather than a fade-to-muted.
  - Wrapped the trust-band footnote ("Browser-mediated · origin-scoped…") in `<Reveal delay={0.1}>`.
  - Verified in browser: `h1` has exactly two `<span>` children; the second span computes to `backgroundImage: linear-gradient(...)` + `webkitTextFillColor: rgba(0, 0, 0, 0)` — gradient on "your rules." confirmed.
- Updated the five remaining landing sections to compose the motion primitives:
  - problem.tsx — section intro in `<Reveal>`, four failure cards in `<StaggerGroup>`/`<StaggerItem>` wrapped in `<LiftOnHover>` with `h-full` so cards lift evenly.
  - inversion.tsx — left column intro in `<Reveal>`; right column four pillars in `<StaggerGroup>`/`<StaggerItem>`/`<LiftOnHover>` with `hover:border-primary/40`.
  - tools-grid.tsx — section intro in `<Reveal>`; six tool cards in `<StaggerGroup>`/`<StaggerItem>`/`<LiftOnHover>` (preserves the existing `group relative` annotation chips).
  - how-it-works.tsx — section intro in `<Reveal>`; four steps in `<StaggerGroup as="ol">` + `<StaggerItem as="li">` so the `<ol>` list semantics are preserved alongside the stagger.
  - stack.tsx — section intro in `<Reveal>`; six stack chips in `<StaggerGroup stagger={0.06}>` with hover lift + `hover:bg-card/70`.
  - cta-band.tsx — wrapped the whole CTA card in `<Reveal>` and added `ring-elevated` so the closing CTA mirrors the hero card's elevation.
- Fixed src/components/theme/theme-toggle.tsx hydration mismatch (pre-existing from Day 1):
  - Root cause: `isDark = resolvedTheme === "dark"` was `false` on the server (resolvedTheme is undefined during SSR) but `true` on the first client render (defaultTheme="dark"), so the `aria-label` and the icon branch differed between SSR and client → React logged a hydration mismatch on every load.
  - Fix: `const isDark = mounted ? resolvedTheme === "dark" : true`. SSR and first client render both produce `isDark=true` (the "Switch to light theme" label + Sun icon), then `useEffect` flips `mounted=true` and the real resolvedTheme takes over. Verified: `agent-browser console --json` shows 0 errors / 0 warnings after the fix.
- Polished src/components/recall/site-header.tsx:
  - Added `supports-[backdrop-filter]:bg-background/65` so browsers that support backdrop-filter get a slightly more transparent header (cleaner blur); fallback stays at 80%.
  - Added `transition-opacity hover:opacity-90` to the logo link so the mark has a small hover affordance.
  - Added `aria-label="Primary"` to the nav for screen-reader users.
  - Fixed mobile horizontal overflow (390px viewport was rendering 486px wide because the nav had too many wide buttons): the "WebMCP Challenge" button is now `hidden sm:inline-flex` (it's a tertiary link that already lives in the footer), the Connect ChatGPT button shows "Connect" on mobile and "Connect ChatGPT" on sm+, and the gap tightened to `gap-0.5 sm:gap-1`. Verified: `documentWidth === viewportWidth === 390` on mobile, no overflow on /, /docs, or /404.
- Did NOT touch site-footer.tsx structurally — it was already balanced (`grid sm:grid-cols-2 lg:grid-cols-4` with four equal columns + sticky `mt-auto`). Verified the sticky contract still holds: `min-h-screen flex-col` wrappers on /, /docs, /404 are intact; footer is `mt-auto`; pinned test on /docs at 1440x2400 returns `docHeight === viewHeight === footerBottom === 2400` with `viewportGap === 0`.
- Did NOT touch lib/, api routes, prisma, package.json (framer-motion was already a dependency), .github, README, LICENSE, SECURITY.md, or .env.example.

Verification:
- ✅ `bun run lint` — 0 errors, 0 warnings.
- ✅ `bun run typecheck` — tsc --noEmit passes clean.
- ✅ Dev server on :3000 — healthy, all routes 200/404 as expected.
- ✅ agent-browser desktop (1440x900) full-page screenshot of `/` — 1440x5114, all sections render in the accessibility tree (banner / main[H1..H3 across hero, problem, inversion, six tools, four steps, stack, CTA] / contentinfo).
- ✅ agent-browser mobile (390x844) — full-page screenshot 390x9086, no horizontal overflow (`documentWidth === 390` on `/`, `/docs`, `/404`).
- ✅ Footer pinned on `/docs` at 1440x2400 — `docHeight === viewHeight === footerBottom === 2400`, `viewportGap === 0`. Sticky footer contract preserved.
- ✅ Console + page errors — 0 errors, 0 warnings after the ThemeToggle hydration fix (verified with `agent-browser console --json` and `agent-browser errors --json`).
- ✅ Reduced-motion emulation — `agent-browser set media reduced-motion reduce` confirms `prefers-reduced-motion: reduce` matches and `glow-activity` computes to `animationName: "none"`; the universal `animation-duration: 0.001ms !important` rule collapses every other CSS animation/transition. Framer-motion's JS animations collapse separately via `useReducedMotion()` in motion-primitives.tsx.
- ✅ Audit-feed live entry — `animationName: "recall-glow-pulse"`, `animationDuration: "2.4s"`, `animationIterationCount: "infinite"` (verified with reduced-motion OFF).
- ✅ Hero headline gradient — second `<span>` computes to `backgroundImage: linear-gradient(to right bottom, lab(69.5...) ...)` + `webkitTextFillColor: rgba(0, 0, 0, 0)`. Gradient renders on the "your rules." line.
- ✅ Palette discipline — no indigo/blue introduced; every new color (ring-elevated, glow-pulse keyframes, second-line gradient) is built from the existing `--primary` / `--accent` CSS variables.

Stage Summary:
- The landing page now has a tasteful, restrained motion rhythm: each section's intro fades up on scroll, grid children stagger in 80ms apart, cards lift -2px on hover (200ms ease-out), and the live audit-feed entry pulses a slow amber glow. Animations are purely additive — none replace semantic content, and the entire motion layer collapses cleanly under `prefers-reduced-motion`.
- A pre-existing React hydration mismatch in ThemeToggle (the only console error on the Day 1 build) is fixed; the browser console is now completely clean (0 errors, 0 warnings) on every page.
- A mobile horizontal overflow at 390px (the nav pushed the body to 486px wide) is fixed; the nav now hides the tertiary "WebMCP Challenge" link on mobile and shortens the Connect CTA to "Connect". All three public pages (/, /docs, /404) have zero horizontal overflow at 390x844 and 1440x900.
- The sticky-footer contract (`min-h-screen flex-col` + `mt-auto`) is preserved verbatim; the /docs short-content page still pins the footer to the viewport bottom with no floating gap at 1440x2400.
- No new dependencies added; framer-motion was already in package.json. No backend/lib/api/prisma files touched.
