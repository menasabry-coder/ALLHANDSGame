import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-module replacement can create multiple instances;
 * the global cache prevents that.
 */

const globalForPrisma = global as typeof globalThis & {
  _prisma?: PrismaClient;
  _sqlitePragmasApplied?: boolean;
};

export const prisma =
  globalForPrisma._prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma._prisma = prisma;
}

function applySqliteConcurrencyPragmas(): void {
  if (globalForPrisma._sqlitePragmasApplied) return;
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:")) return;

  globalForPrisma._sqlitePragmasApplied = true;
  const ignorePragmaError = () => undefined;

  void prisma
    .$executeRawUnsafe("PRAGMA journal_mode = WAL;")
    .catch(ignorePragmaError);
  void prisma
    .$executeRawUnsafe("PRAGMA busy_timeout = 5000;")
    .catch(ignorePragmaError);
  void prisma
    .$executeRawUnsafe("PRAGMA synchronous = NORMAL;")
    .catch(ignorePragmaError);
}

applySqliteConcurrencyPragmas();
