import type { Prisma, PrismaClient } from "@prisma/client";
import {
  progressMatch,
} from "@/lib/progression/progression-engine";
import {
  resolveCompetitionCompletion,
} from "@/lib/progression/completion-engine";

type Tx = PrismaClient | Prisma.TransactionClient;

export type ProgressionRecoveryResult = {
  checkedMatches: number;
  recoveredMatches: number;
  advancedSlots: number;
  stageRankAdvanced: number;
  stageCompletions: number;
  bracketCompletions: number;
};

/**
 * V31.3.5 Progression Recovery Engine.
 *
 * Recovery replays the existing idempotent progression and completion
 * operations for completed matches in a tournament.
 *
 * It never:
 * - changes scores
 * - chooses a winner
 * - completes an incomplete match
 * - creates new bracket structure
 *
 * AdvancementSlot.resolvedAt and ProgressionEvent provide the idempotency
 * boundaries, so running recovery multiple times is safe.
 */
export async function recoverTournamentProgression(
  tx: Tx,
  tournamentId: string,
): Promise<ProgressionRecoveryResult> {
  const matches = await tx.match.findMany({
    where: {
      tournamentId,
      status: "COMPLETED",
    },
    select: {
      id: true,
    },
    orderBy: {
      endedAt: "asc",
    },
  });

  let recoveredMatches = 0;
  let advancedSlots = 0;
  let stageRankAdvanced = 0;
  let stageCompletions = 0;
  let bracketCompletions = 0;

  /**
   * First pass:
   * Replay match-result progression and resolve completion state.
   */
  for (const match of matches) {
    const progression = await progressMatch(
      tx,
      match.id,
    );

    const completion =
      await resolveCompetitionCompletion(
        tx,
        match.id,
      );

    const progressionCount =
      progression.advanced.length +
      progression.stageRankAdvanced.length;

    if (
      progressionCount > 0 ||
      completion.stageCompleted ||
      completion.bracketCompleted
    ) {
      recoveredMatches += 1;
    }

    advancedSlots +=
      progression.advanced.length;

    stageRankAdvanced +=
      progression.stageRankAdvanced.length;

    if (completion.stageCompleted) {
      stageCompletions += 1;
    }

    if (completion.bracketCompleted) {
      bracketCompletions += 1;
    }
  }

  /**
   * Second pass:
   *
   * A stage may become COMPLETED during the first pass. Re-running
   * progression after completion allows STAGE_RANK advancement slots
   * to resolve without requiring another match update.
   *
   * This is safe because resolved slots are idempotent.
   */
  for (const match of matches) {
    const progression = await progressMatch(
      tx,
      match.id,
    );

    if (
      progression.advanced.length > 0 ||
      progression.stageRankAdvanced.length > 0
    ) {
      recoveredMatches += 1;
    }

    advancedSlots +=
      progression.advanced.length;

    stageRankAdvanced +=
      progression.stageRankAdvanced.length;
  }

  return {
    checkedMatches: matches.length,
    recoveredMatches,
    advancedSlots,
    stageRankAdvanced,
    stageCompletions,
    bracketCompletions,
  };
}

/**
 * Run progression recovery inside a database transaction.
 */
export async function recoverTournamentProgressionTransaction(
  db: PrismaClient,
  tournamentId: string,
): Promise<ProgressionRecoveryResult> {
  return db.$transaction(
    (tx) =>
      recoverTournamentProgression(
        tx,
        tournamentId,
      ),
    {
      timeout: 30_000,
    },
  );
}