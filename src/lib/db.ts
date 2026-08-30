import { PrismaClient } from "@prisma/client";

/**
 * Recall — Prisma client singleton.
 *
 * A single client is reused across hot-reloads in dev to avoid exhausting the
 * SQLite connection pool. In production (Vercel serverless), each function
 * invocation gets its own client; Prisma handles the pooling.
 *
 * Query logging is intentionally minimal — Recall's observability layer is the
 * audit log (lib/audit), not Prisma's console output. Keeping the runtime
 * logs quiet makes the dev.log readable and keeps production logs focused on
 * the tool calls that actually matter for the demo.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
