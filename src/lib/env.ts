import { z } from "zod";

/**
 * Typed access to server-side environment variables.
 *
 * Recall never reads `process.env` directly outside this module. Every secret
 * the application needs is declared here, validated once at boot, and exposed
 * as a typed `env` object. This keeps the Day 2+ work (OAuth, signing keys,
 * capability tokens) honest: a missing variable fails loudly at startup, not
 * silently at runtime.
 *
 * Secrets are NEVER shipped to the client. This module is server-only.
 */
const envSchema = z.object({
  // --- Database (Turso / libSQL) ---
  // The runtime connection uses TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
  // DATABASE_URL is used by the Prisma CLI for schema validation (local file).
  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL is required"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // --- Site identity ---
  // The public origin Recall is served from. Used to compute cookie scope and
  // the WebMCP `fromOrigins` grant set. Defaults to localhost for dev.
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  // The site name shown in the UI and audit log provenance.
  NEXT_PUBLIC_SITE_NAME: z.string().default("Recall"),

  // --- Auth (GitHub OAuth — demo-day substitute for ChatGPT OAuth) ---
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  // Random 32+ char string used to sign the session cookie.
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),

  // --- Site signing key (WebCrypto) ---
  // Optional in dev: if absent, a deterministic dev key is derived from
  // SESSION_SECRET on first request and cached. Production MUST set a stable
  // base64-encoded JWK so signatures verify across deployments.
  RECALL_SITE_KEY_JWK: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    // Fail loudly in non-dev environments; warn but continue in dev so the
    // landing page can render during initial scaffold (Day 1).
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    console.warn(`[recall] Incomplete environment (dev fallback):\n${issues}`);
  }
  // Fall back to a permissive shape in dev so the scaffold renders.
  return (parsed.success ? parsed.data : (process.env as unknown)) as Env;
}

export const env = loadEnv();

/** True when all Day 2+ secrets (GitHub OAuth) are configured. */
export const authConfigured = Boolean(
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET,
);
