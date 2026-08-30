# Recall — Security Model

Recall's defense is **structural**, not just code. The trust model is anchored
to the WebMCP spec topology: a website publishes its own state as a tool
surface, and an external agent client (ChatGPT) is granted browser-mediated,
origin-scoped, capability-token-authenticated, audit-logged access to read and
write that state.

## Trust boundaries

| Boundary | What it enforces |
| --- | --- |
| **TLS origin** | Tools are published only from `recall.app` (or its preview). An attacker cannot impersonate the origin without the private key. |
| **Browser sandbox** | Tool handlers execute in the page's existing sandbox. There is no out-of-band channel to the backend. |
| **`fromOrigins` grant** | Tools are exposed only to the agent origins the user grants (default: `https://chatgpt.com`). |
| **Capability token** | Every tool call presents a short-TTL (60–300s), audience-restricted, scope-limited token signed with the user's site key. |
| **Audit log** | Every call is appended to an immutable, signed log. The user can export and verify it independently of the database. |

## The four attack classes Recall closes

1. **Agent impersonation** — a non-granted origin cannot call Recall's tools
   because the `fromOrigins` grant and the capability token's audience are
   both scoped to the user-approved origin set.

2. **Tool-call forgery** — a forged tool call cannot present a valid
   capability token because tokens are signed with the user's site key
   (WebCrypto `ECDSA P-256`), and the key is never derived client-side.

3. **Silent state mutation** — every mutation (`addFact`, `updateFact`,
   `forgetFact`) appends a signed audit entry. The user sees the change in
   the activity feed in real time and can roll it back from the audit log.

4. **Audit-log tampering** — audit entries are append-only and each carries
   a detached JWS signature. The exported log bundle is verifiable with the
   user's public key without trusting the database.

## Secrets

| Secret | Where it lives | Rotated |
| --- | --- | --- |
| `SESSION_SECRET` | Env var (Vercel) | Quarterly / on incident |
| `GITHUB_CLIENT_SECRET` | Env var (Vercel) | On provider rotation |
| `RECALL_SITE_KEY_JWK` | Optional env override; otherwise generated per-user via WebCrypto and stored as a JWK in the `User.siteKeyJwk` column | On key rotation (post-MVP) |

Secrets are **never** shipped to the client. The `lib/env.ts` module is the
single server-side entry point for environment access; it validates every
variable at boot and fails loudly in production when one is missing.

## Demo-day notes

- GitHub OAuth is the demo-day substitute for ChatGPT OAuth (third-party
  ChatGPT OAuth is not GA). This trade-off is documented in the README and
  on the `/login` page; the production plan swaps in ChatGPT OAuth when it
  ships to third parties.
- The capability-token flow is enforced server-side even when the
  `permissions-policy: tools` header is unavailable, so the security model
  does not depend on a single browser feature landing on demo day.

## Reporting a vulnerability

This is a hackathon project; there is no formal bounty program. If you find a
security issue, open a private GitHub Security Advisory on the repository.
