import type { Prisma, PrismaClient } from "@prisma/client";
import { advanceCompetitionFromMatch } from "@/lib/competition-progression";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * V31.3.1 compatibility entry point.
 *
 * The actual progression implementation lives in
 * competition-progression.ts. This wrapper gives the match API a single
 * progression entry point without duplicating progression logic.
 */
export async function progressMatch(
  matchId: string,
  tx?: Tx,
) {
  if (tx) {
    return advanceCompetitionFromMatch(tx, matchId);
  }

  // Standalone calls use a fresh Prisma client through the existing
  // application database singleton.
  const { db } = await import("@/lib/db");

  return db.$transaction((transaction) =>
    advanceCompetitionFromMatch(transaction, matchId),
  );
}