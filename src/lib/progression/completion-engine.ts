import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export type CompletionResult = {
  stageCompleted: boolean;
  bracketCompleted: boolean;
  winnerId: string | null;
};

/**
 * V31.3.4 Bracket Completion Engine.
 *
 * Completion is derived from the persisted match graph rather than from
 * round names or bracket structure JSON. This keeps the engine compatible
 * with imported brackets and future competition formats.
 *
 * ProgressionEvent provides the idempotency boundary for completion events.
 */
export async function resolveCompetitionCompletion(
  tx: Tx,
  completedMatchId: string,
): Promise<CompletionResult> {
  const match = await tx.match.findUnique({
    where: {
      id: completedMatchId,
    },
    select: {
      id: true,
      tournamentId: true,
      bracketId: true,
      stageId: true,
      status: true,
    },
  });

  if (!match || match.status !== "COMPLETED") {
    return {
      stageCompleted: false,
      bracketCompleted: false,
      winnerId: null,
    };
  }

  let stageCompleted = false;
  let bracketCompleted = false;
  let winnerId: string | null = null;

  /**
   * Stage completion.
   *
   * A stage is complete only when it contains at least one match and every
   * match belonging to it has reached COMPLETED.
   */
  if (match.stageId) {
    const [stage, stageMatchCount, remainingMatches] = await Promise.all([
      tx.competitionStage.findUnique({
        where: {
          id: match.stageId,
        },
        select: {
          id: true,
          tournamentId: true,
          status: true,
        },
      }),
      tx.match.count({
        where: {
          stageId: match.stageId,
        },
      }),
      tx.match.count({
        where: {
          stageId: match.stageId,
          status: {
            not: "COMPLETED",
          },
        },
      }),
    ]);

    if (stage && stageMatchCount > 0 && remainingMatches === 0) {
      const existingEvent = await tx.progressionEvent.findFirst({
        where: {
          tournamentId: match.tournamentId,
          eventType: "STAGE_COMPLETED",
        },
        select: {
          id: true,
        },
      });

      const updated = await tx.competitionStage.updateMany({
        where: {
          id: stage.id,
          status: {
            not: "COMPLETED",
          },
        },
        data: {
          status: "COMPLETED",
        },
      });

      if (!existingEvent) {
        await tx.progressionEvent.create({
          data: {
            tournamentId: match.tournamentId,
            matchId: completedMatchId,
            eventType: "STAGE_COMPLETED",
            payload: {
              stageId: stage.id,
            },
          },
        });
      }

      stageCompleted = updated.count > 0 || existingEvent !== null;
    }
  }

  /**
   * Bracket completion.
   *
   * A bracket is complete only when every materialized match in that bracket
   * has reached COMPLETED.
   */
  if (match.bracketId) {
    const [bracketMatchCount, remainingMatches] = await Promise.all([
      tx.match.count({
        where: {
          bracketId: match.bracketId,
        },
      }),
      tx.match.count({
        where: {
          bracketId: match.bracketId,
          status: {
            not: "COMPLETED",
          },
        },
      }),
    ]);

    if (bracketMatchCount > 0 && remainingMatches === 0) {
      const existingEvent = await tx.progressionEvent.findFirst({
        where: {
          tournamentId: match.tournamentId,
          eventType: "BRACKET_COMPLETED",
        },
        select: {
          id: true,
        },
      });

      if (!existingEvent) {
        const finalMatch = await tx.match.findFirst({
          where: {
            bracketId: match.bracketId,
            status: "COMPLETED",
          },
          orderBy: [
            {
              roundIndex: "desc",
            },
            {
              matchIndex: "desc",
            },
          ],
          select: {
            id: true,
            winnerId: true,
          },
        });

        winnerId = finalMatch?.winnerId ?? null;

        await tx.progressionEvent.create({
          data: {
            tournamentId: match.tournamentId,
            matchId: completedMatchId,
            eventType: "BRACKET_COMPLETED",
            payload: {
              bracketId: match.bracketId,
              finalMatchId: finalMatch?.id ?? null,
              winnerId,
            },
          },
        });
      }

      bracketCompleted = true;
    }
  }

  return {
    stageCompleted,
    bracketCompleted,
    winnerId,
  };
}