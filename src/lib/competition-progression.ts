import type { Prisma, PrismaClient } from "@prisma/client";
import { calculateStandings } from "@/lib/standings-engine";

type Tx = PrismaClient | Prisma.TransactionClient;

type Identity = { playerId?: string; teamId?: string; displayName?: string };

/**
 * V28 generic progression engine.
 *
 * Stages are persistent, and AdvancementSlot is the only relation that knows
 * how a result moves. A source can be a match winner/loser, a stage rank, or a
 * manual slot. This deliberately operates on MatchSide participants instead
 * of playerOneId/playerTwoId, so the same path works for singles, pairs,
 * teams, mixed rosters and custom display participants.
 */
export async function advanceCompetitionFromMatch(tx: Tx, matchId: string) {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    include: {
      sides: { include: { participants: true } },
      sourceAdvancements: true,
    },
  });
  if (!match || match.status !== "COMPLETED") return [];

  const winner = match.winnerSideId ? match.sides.find((s) => s.id === match.winnerSideId) : null;
  const loser = match.winnerSideId ? match.sides.find((s) => s.id !== match.winnerSideId) : null;
  if (!winner) return [];

  const results: Array<{ slotId: string; targetMatchId: string; targetSideKey: string }> = [];

  for (const slot of match.sourceAdvancements) {
    if (slot.sourceType !== "MATCH_RESULT") continue;
    const sourceSide = slot.outcome === "LOSER" ? loser : winner;
    if (!sourceSide) continue;

    const targetSide = await tx.matchSide.findFirst({
      where: { matchId: slot.targetMatchId, sideKey: slot.targetSideKey },
    });
    if (!targetSide) continue;

    await tx.matchParticipant.deleteMany({ where: { sideId: targetSide.id } });
    if (sourceSide.participants.length) {
      await tx.matchParticipant.createMany({
        data: sourceSide.participants.map((p) => ({
          sideId: targetSide.id,
          playerId: p.playerId,
          teamId: p.teamId,
          role: p.role,
          displayName: p.displayName,
        })),
      });
    }

    await tx.advancementSlot.update({ where: { id: slot.id }, data: { resolvedAt: new Date() } });
    results.push({ slotId: slot.id, targetMatchId: slot.targetMatchId, targetSideKey: slot.targetSideKey });
  }

  // A target becomes schedulable only when every target side has at least one
  // participant. Empty sides remain intentional placeholders.
  const touched = [...new Set(results.map((r) => r.targetMatchId))];
  for (const targetMatchId of touched) {
    const sides = await tx.matchSide.findMany({ where: { matchId: targetMatchId }, include: { participants: true } });
    if (sides.length >= 2 && sides.every((s) => s.participants.length > 0)) {
      await tx.match.updateMany({ where: { id: targetMatchId, status: "QUEUED" }, data: { status: "QUEUED" } });
    }
  }

  return results;
}

/**
 * Resolve stage-rank advancement slots. This is intentionally separate from
 * match-result progression because a stage can be a league/group/Swiss phase
 * and its final ranking is not known until the stage is complete.
 */
export async function resolveStageRankAdvancements(tx: Tx, stageId: string) {
  const slots = await tx.advancementSlot.findMany({
    where: { sourceStageId: stageId, sourceType: "STAGE_RANK", resolvedAt: null, sourceRank: { not: null } },
  });
  if (!slots.length) return [];

  const matches = await tx.match.findMany({
    where: { stageId },
    include: {
      sides: { include: { participants: { include: { player: true, team: true } } } },
    },
  });
  const standings = calculateStandings(matches as any);
  const results: Array<{ slotId: string; targetMatchId: string; targetSideKey: string }> = [];

  for (const slot of slots) {
    const row = standings.find((r) => r.rank === slot.sourceRank);
    if (!row) continue;
    const matchSide = await tx.matchSide.findFirst({ where: { matchId: slot.targetMatchId, sideKey: slot.targetSideKey } });
    if (!matchSide) continue;

    const identity: Identity = row.key.startsWith("team:")
      ? { teamId: row.key.slice(5) }
      : row.key.startsWith("players:") && row.key.slice(8).includes(",")
        ? { displayName: row.label }
        : row.key.startsWith("players:")
          ? { playerId: row.key.slice(8) }
          : { displayName: row.label };

    await tx.matchParticipant.deleteMany({ where: { sideId: matchSide.id } });
    await tx.matchParticipant.create({ data: { sideId: matchSide.id, ...identity } });
    await tx.advancementSlot.update({ where: { id: slot.id }, data: { resolvedAt: new Date() } });
    results.push({ slotId: slot.id, targetMatchId: slot.targetMatchId, targetSideKey: slot.targetSideKey });
  }

  return results;
}
