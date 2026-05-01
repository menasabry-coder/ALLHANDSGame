import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-module replacement can create multiple instances;
 * the global cache prevents that.
 */

const globalForPrisma = global as typeof globalThis & {
  _prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma._prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma._prisma = prisma;
}
