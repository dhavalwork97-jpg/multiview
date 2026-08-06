import { PrismaClient } from "@prisma/client";

// Next.js dev-mode hot reload re-executes modules on every save, which
// would otherwise spin up a new PrismaClient (and new connection pool)
// per reload. Cache it on `globalThis` in non-production.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
