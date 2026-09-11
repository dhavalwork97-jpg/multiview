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
    // Tournament creation builds players, entrants, stations, stages, matches,
    // sides and advancement slots in one transaction. Render's database can
    // occasionally take longer than Prisma's 5s interactive transaction
    // default, which otherwise surfaces as P2028 and an empty/500 response.
    transactionOptions: {
      maxWait: 10000,
      timeout: 30000,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
