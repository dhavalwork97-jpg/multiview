import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * V31.4 bracket progression.
 *
 * AdvancementSlot.resolvedAt makes this operation idempotent.
 * A completed match can safely be processed multiple times without
 * re-populating an already-resolved downstream slot.
 */
export async function advanceBracket(
  tx: Tx,
  completedMatchId: string,
) {
  const match = await tx.match.findUnique({
    where: {
      id: completedMatchId,
    },
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

  const winner =
    match.sides.find((side) => side.id === match.winnerSideId) ?? null;

  const loser =
    match.sides.find((side) => side.id !== match.winnerSideId) ?? null;

  if (!winner) {
    return [];
  }

  const results: Array<{
    targetMatchId: string;
    targetSideKey: string;
  }> = [];

  for (const slot of match.sourceAdvancements) {
    const sourceSide =
      slot.outcome === "LOSER"
        ? loser
        : winner;

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

    results.push({
      targetMatchId: slot.targetMatchId,
      targetSideKey: slot.targetSideKey,
    });
  }

  return results;
}
