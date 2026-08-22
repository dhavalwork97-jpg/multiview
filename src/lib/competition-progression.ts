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
    ? match.sides.find((s) => s.id === match.winnerSideId)
    : null;

  const loser = match.winnerSideId
    ? match.sides.find((s) => s.id !== match.winnerSideId)
    : null;

  if (!winner) {
    return [];
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

    const sourceSide = slot.outcome === "LOSER" ? loser : winner;

    if (!sourceSide) {
      continue;
    }

    const targetSide = await tx.matchSide.findFirst({
      where: {
        matchId: slot.targetMatchId,
        sideKey: slot.targetSideKey,
      },
    });

    if (!targetSide) {
      continue;
    }

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

    const resolved = await tx.advancementSlot.updateMany({
      where: {
        id: slot.id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    if (resolved.count !== 1) {
      continue;
    }

    results.push({
      slotId: slot.id,
      targetMatchId: slot.targetMatchId,
      targetSideKey: slot.targetSideKey,
    });
  }

  const touched = [
    ...new Set(results.map((result) => result.targetMatchId)),
  ];

  for (const targetMatchId of touched) {
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
      sides.every((side) => side.participants.length > 0)
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

    const resolved = await tx.advancementSlot.updateMany({
      where: {
        id: slot.id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    if (resolved.count !== 1) {
      continue;
    }

    results.push({
      slotId: slot.id,
      targetMatchId: slot.targetMatchId,
      targetSideKey: slot.targetSideKey,
    });
  }

  return results;
}
