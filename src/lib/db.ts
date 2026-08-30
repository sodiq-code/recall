import { createClient, type Client, type InStatement, type InArgs } from "@libsql/client";

/**
 * Recall — database access layer (Turso / libSQL).
 *
 * Recall uses Turso (libSQL) as its database so the same schema works on
 * Vercel serverless AND in local dev. This module is the single entry point
 * for database access — every route and lib helper imports `db` from here.
 *
 * Why libSQL directly (not Prisma's query engine):
 * Prisma v6's Rust query engine reads the datasource URL from the generated
 * client at initialization. When the URL is `libsql://` (Turso), the engine
 * rejects it with `URL_INVALID: The URL 'undefined'` because the sqlite
 * provider only accepts `file:` URLs. The `@prisma/adapter-libsql` driver
 * adapter provides the runtime connection, but the engine still initializes
 * and fails under Turbopack. Rather than fight the engine, Recall uses the
 * `@libsql/client` directly — the same client the adapter wraps — with a
 * thin typed access layer. The Prisma schema is retained as the source of
 * truth for the data model and for future migration to Prisma when the
 * engine supports libSQL natively.
 *
 * Env vars:
 *   - TURSO_DATABASE_URL  the libsql:// URL (NOT in the system env, so
 *     Next.js loads it reliably from .env)
 *   - TURSO_AUTH_TOKEN    the Turso auth JWT (separate, per Turso convention)
 *
 * The client is created lazily on first use so env vars are guaranteed to be
 * resolved before the connection opens.
 */
const globalForDb = globalThis as unknown as {
  __recallLibsql?: Client;
};

function resolveTursoUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || url === "undefined") {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Ensure .env is loaded with the Turso connection URL.",
    );
  }
  if (token && !url.includes("authToken=")) {
    return `${url}?authToken=${token}`;
  }
  return url;
}

function getClient(): Client {
  if (!globalForDb.__recallLibsql) {
    globalForDb.__recallLibsql = createClient({ url: resolveTursoUrl() });
  }
  return globalForDb.__recallLibsql;
}

/**
 * The libSQL client. Use `db.execute(sql, args)` for raw queries.
 *
 * For type-safe access, prefer the typed helpers in `lib/db/` (e.g.
 * `findUserByOauthSubject`, `createFact`) which wrap this client with the
 * Prisma-generated types. The raw client is exposed for migrations and ad-hoc
 * queries.
 */
export const db = {
  /**
   * Execute a SQL statement. Accepts either a string + args, or an
   * `{ sql, args }` object (matching @libsql/client's InStatement type).
   */
  execute(statement: InStatement, args?: InArgs) {
    if (typeof statement === "string") {
      return getClient().execute({ sql: statement, args });
    }
    return getClient().execute(statement);
  },
  /** Execute a batch of statements in a transaction. */
  batch(
    statements: InStatement[],
    mode: "deferred" | "write" | "deferred" = "write",
  ) {
    return getClient().batch(statements, mode);
  },
  /** The raw libSQL client for advanced use. */
  get raw() {
    return getClient();
  },
};

export type { Client };
