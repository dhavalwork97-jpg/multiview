import type { Prisma, PrismaClient } from "@prisma/client";
import {
  advanceCompetitionFromMatch,
  resolveStageRankAdvancements,
} from "@/lib/competition-progression";

type Tx = PrismaClient | Prisma.TransactionClient;

type ProgressionAdvancement = {
  slotId: string;
  targetMatchId: string;
  targetSideKey: string;
};

export async function progressMatch(
  tx: Tx,
  matchId: string,
) {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      stageId: true,
    },
  });

  if (!match || match.status !== "COMPLETED") {
    return {
      advanced: [],
      stageRankAdvanced: [],
    };
  }

  const advanced = await advanceCompetitionFromMatch(
    tx,
    matchId,
  );

  let stageRankAdvanced: ProgressionAdvancement[] = [];

  if (match.stageId) {
    const stage = await tx.competitionStage.findUnique({
      where: { id: match.stageId },
      select: {
        status: true,
      },
    });

    if (stage?.status === "COMPLETED") {
      stageRankAdvanced = await resolveStageRankAdvancements(
        tx,
        match.stageId,
      );
    }
  }

  return {
    advanced,
    stageRankAdvanced,
  };
}

export async function progressMatchTransaction(
  db: PrismaClient,
  matchId: string,
) {
  return db.$transaction(
    (tx) => progressMatch(tx, matchId),
    {
      timeout: 30_000,
    },
  );
}