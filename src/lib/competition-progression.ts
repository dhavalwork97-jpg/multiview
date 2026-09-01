import type { Prisma, PrismaClient } from "@prisma/client";
import { calculateStandings } from "@/lib/standings-engine";

type Tx = PrismaClient | Prisma.TransactionClient;

type Identity = {
  playerId?: string;
  teamId?: string;
  displayName?: string;
};

/**
 * V31.4 progression engine.
 *
 * AdvancementSlot.resolvedAt is the idempotency boundary:
 * once a slot has been resolved, it must never move its source again.
 *
 * This makes repeated COMPLETED requests safe and prevents duplicate
 * participant writes / duplicate progression events.
 */
export async function advanceCompetitionFromMatch(
  tx: Tx,
  matchId: string,
) {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    include: {
      sides: {
        include: {
          participants: true,
        },
      },
      sourceAdvancements: {
        where: {
          resolvedAt: null,
        },
      },
    },
  });

  if (!match || match.status !== "COMPLETED") {
    return [];
  }

  const winner = match.winnerSideId
    ? match.sides.find((side) => side.id === match.winnerSideId)
    : null;

  const loser = match.winnerSideId
    ? match.sides.find((side) => side.id !== match.winnerSideId)
    : null;

  if (!winner) {
    return [];
  }

  /*
   * MATCH_COMPLETED is a match-level event.
   *
   * It must be emitted at most once regardless of how many advancement
   * slots this match has and regardless of how many times progression is
   * invoked for the same completed match.
   */
  const existingCompletionEvent =
    await tx.progressionEvent.findFirst({
      where: {
        matchId: match.id,
        eventType: "MATCH_COMPLETED",
      },
      select: {
        id: true,
      },
    });

  if (!existingCompletionEvent) {
    await tx.progressionEvent.create({
      data: {
        tournamentId: match.tournamentId,
        matchId: match.id,
        eventType: "MATCH_COMPLETED",
        payload: {
          winnerSideId: winner.id,
          winnerSideKey: winner.sideKey,
        },
      },
    });
  }

  const results: Array<{
    slotId: string;
    targetMatchId: string;
    targetSideKey: string;
  }> = [];

  for (const slot of match.sourceAdvancements) {
    if (slot.sourceType !== "MATCH_RESULT") {
      continue;
    }

    const sourceSide =
      slot.outcome === "LOSER"
        ? loser
        : winner;

    if (!sourceSide) {
      await tx.progressionEvent.create({
        data: {
          tournamentId: match.tournamentId,
          matchId: match.id,
          targetMatchId: slot.targetMatchId,
          eventType: "SLOT_SKIPPED",
          payload: {
            advancementSlotId: slot.id,
            outcome: slot.outcome,
            reason: "Source side is unavailable",
          },
        },
      });

      continue;
    }

    const targetSide = await tx.matchSide.findFirst({
      where: {
        matchId: slot.targetMatchId,
        sideKey: slot.targetSideKey,
      },
    });

    if (!targetSide) {
      await tx.progressionEvent.create({
        data: {
          tournamentId: match.tournamentId,
          matchId: match.id,
          targetMatchId: slot.targetMatchId,
          eventType: "SLOT_SKIPPED",
          payload: {
            advancementSlotId: slot.id,
            outcome: slot.outcome,
            targetSideKey: slot.targetSideKey,
            reason: "Target side does not exist",
          },
        },
      });

      continue;
    }

    /*
     * V31.3.3: claim the slot before mutating the target side, but do not
     * resolve it until the mutation has completed successfully.
     *
     * claimedByMatchId is the ownership token. The conditional update is the
     * concurrency boundary: only one caller can acquire an unclaimed,
     * unresolved slot. claimAttempt records every successful acquisition.
     */
    const claimed = await tx.advancementSlot.updateMany({
      where: {
        id: slot.id,
        resolvedAt: null,
        claimedByMatchId: null,
      },
      data: {
        claimedByMatchId: match.id,
        claimAttempt: {
          increment: 1,
        },
      },
    });

    if (claimed.count !== 1) {
      continue;
    }

    try {
      await tx.matchParticipant.deleteMany({
        where: {
          sideId: targetSide.id,
        },
      });

      if (sourceSide.participants.length > 0) {
        await tx.matchParticipant.createMany({
          data: sourceSide.participants.map((participant) => ({
            sideId: targetSide.id,
            playerId: participant.playerId,
            teamId: participant.teamId,
            role: participant.role,
            displayName: participant.displayName,
          })),
        });
      }

      /*
       * Resolve only if we still own the claim. This conditional update makes
       * the state transition explicit and prevents another caller from
       * resolving a slot it did not claim.
       */
      const resolved = await tx.advancementSlot.updateMany({
        where: {
          id: slot.id,
          resolvedAt: null,
          claimedByMatchId: match.id,
        },
        data: {
          resolvedAt: new Date(),
        },
      });

      if (resolved.count !== 1) {
        throw new Error(`Lost advancement slot claim ${slot.id}`);
      }

      await tx.progressionEvent.create({
        data: {
          tournamentId: match.tournamentId,
          matchId: match.id,
          targetMatchId: slot.targetMatchId,
          targetSideId: targetSide.id,
          eventType:
            slot.outcome === "LOSER"
              ? "LOSER_ADVANCED"
              : "WINNER_ADVANCED",
          payload: {
            advancementSlotId: slot.id,
            sourceSideId: sourceSide.id,
            sourceSideKey: sourceSide.sideKey,
            targetSideKey: slot.targetSideKey,
            participantCount: sourceSide.participants.length,
            claimAttempt: true,
          },
        },
      });

      results.push({
        slotId: slot.id,
        targetMatchId: slot.targetMatchId,
        targetSideKey: slot.targetSideKey,
      });
    } catch (error) {
      /*
       * A failed mutation must not leave the slot permanently claimed.
       * Release only our own unresolved claim so a retry can safely acquire it.
       */
      await tx.advancementSlot.updateMany({
        where: {
          id: slot.id,
          resolvedAt: null,
          claimedByMatchId: match.id,
        },
        data: {
          claimedByMatchId: null,
        },
      });

      throw error;
    }
  }

  const touchedTargetMatches = [
    ...new Set(
      results.map((result) => result.targetMatchId),
    ),
  ];

  for (const targetMatchId of touchedTargetMatches) {
    const sides = await tx.matchSide.findMany({
      where: {
        matchId: targetMatchId,
      },
      include: {
        participants: true,
      },
    });

    if (
      sides.length >= 2 &&
      sides.every(
        (side) => side.participants.length > 0,
      )
    ) {
      await tx.match.updateMany({
        where: {
          id: targetMatchId,
          status: "QUEUED",
        },
        data: {
          status: "QUEUED",
        },
      });
    }
  }

  return results;
}

/**
 * Resolve stage-rank advancement slots.
 *
 * Only unresolved slots are considered. Once a ranking has populated a
 * target side, that advancement cannot be applied a second time.
 */
export async function resolveStageRankAdvancements(
  tx: Tx,
  stageId: string,
) {
  const slots = await tx.advancementSlot.findMany({
    where: {
      sourceStageId: stageId,
      sourceType: "STAGE_RANK",
      resolvedAt: null,
      sourceRank: {
        not: null,
      },
    },
  });

  if (!slots.length) {
    return [];
  }

  const matches = await tx.match.findMany({
    where: {
      stageId,
    },
    include: {
      sides: {
        include: {
          participants: {
            include: {
              player: true,
              team: true,
            },
          },
        },
      },
    },
  });

  const standings = calculateStandings(matches as any);

  const results: Array<{
    slotId: string;
    targetMatchId: string;
    targetSideKey: string;
  }> = [];

  for (const slot of slots) {
    const row = standings.find(
      (standing) => standing.rank === slot.sourceRank,
    );

    if (!row) {
      continue;
    }

    const matchSide = await tx.matchSide.findFirst({
      where: {
        matchId: slot.targetMatchId,
        sideKey: slot.targetSideKey,
      },
    });

    if (!matchSide) {
      continue;
    }

    const identity: Identity = row.key.startsWith("team:")
      ? {
          teamId: row.key.slice(5),
        }
      : row.key.startsWith("players:") &&
          row.key.slice(8).includes(",")
        ? {
            displayName: row.label,
          }
        : row.key.startsWith("players:")
          ? {
              playerId: row.key.slice(8),
            }
          : {
              displayName: row.label,
            };

    const claimed = await tx.advancementSlot.updateMany({
      where: {
        id: slot.id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      continue;
    }

    await tx.matchParticipant.deleteMany({
      where: {
        sideId: matchSide.id,
      },
    });

    await tx.matchParticipant.create({
      data: {
        sideId: matchSide.id,
        ...identity,
      },
    });

    const targetSides = (await tx.matchSide.findMany({
      where: { matchId: slot.targetMatchId },
      include: { participants: true },
    })) ?? [];
    if (targetSides.length >= 2 && targetSides.every((side) => side.participants.length > 0)) {
      await tx.match.updateMany({
        where: { id: slot.targetMatchId, status: "QUEUED" },
        data: { status: "QUEUED" },
      });
    }

    results.push({
      slotId: slot.id,
      targetMatchId: slot.targetMatchId,
      targetSideKey: slot.targetSideKey,
    });
  }

  return results;
}
