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
    const stageMatches = await tx.match.findMany({
      where: { stageId: match.stageId },
      select: { id: true, status: true },
    });
    const stageComplete =
      stageMatches.length > 0 &&
      stageMatches.every((stageMatch) => stageMatch.status === "COMPLETED");

    if (stageComplete) {
      const stage = await tx.competitionStage.findUnique({
        where: { id: match.stageId },
        select: { id: true, status: true, tournamentId: true },
      });

      if (stage && stage.status !== "COMPLETED") {
        await tx.competitionStage.update({
          where: { id: stage.id },
          data: { status: "COMPLETED" },
        });
        const existingStageEvent = await tx.progressionEvent.findFirst({
          where: { matchId: match.id, eventType: "STAGE_COMPLETED" },
          select: { id: true },
        });
        if (!existingStageEvent) {
          await tx.progressionEvent.create({
            data: {
              tournamentId: stage.tournamentId,
              matchId: match.id,
              eventType: "STAGE_COMPLETED",
              payload: { stageId: stage.id, automatic: true },
            },
          });
        }
      }

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