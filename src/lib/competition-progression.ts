import type { Prisma, PrismaClient } from "@prisma/client";
import { calculateStandings } from "@/lib/standings-engine";

type Tx = PrismaClient | Prisma.TransactionClient;

type Identity = {
  playerId?: string;
  teamId?: string;
  displayName?: string;
};

export async function advanceCompetitionFromMatch(tx: Tx, matchId: string) {
  const match = await tx.match.findUnique({ where: { id: matchId }, include: { sides: { include: { participants: true } } } });
  if (!match || match.status !== "COMPLETED") return null;
  const targetSlots = await tx.advancementSlot.findMany({ where: { sourceMatchId: matchId, resolvedAt: null } });
  if (!targetSlots.length) return null;
  for (const slot of targetSlots) {
    const sourceSide = match.sides.find((side) => side.sideKey === slot.sourceSideKey);
    if (!sourceSide) continue;
    const participant = sourceSide.participants[0];
    const identity: Identity = participant ? { playerId: participant.playerId ?? undefined, teamId: participant.teamId ?? undefined } : {};
    const targetSide = await tx.matchSide.findFirst({ where: { matchId: slot.targetMatchId, sideKey: slot.targetSideKey } });
    if (!targetSide) continue;
    await tx.matchSideParticipant.deleteMany({ where: { matchSideId: targetSide.id } });
    if (identity.playerId || identity.teamId) await tx.matchSideParticipant.create({ data: { matchSideId: targetSide.id, playerId: identity.playerId ?? null, teamId: identity.teamId ?? null, displayName: identity.displayName ?? null } });
    await tx.advancementSlot.update({ where: { id: slot.id }, data: { resolvedAt: new Date() } });
  }
  return true;
}

export async function resolveStageRankAdvancements(tx: Tx, stageId: string) {
  const slots = await tx.advancementSlot.findMany({ where: { sourceStageId: stageId, sourceType: "STAGE_RANK", resolvedAt: null, sourceRank: { not: null } } });
  if (!slots.length) return [];
  const matches = await tx.match.findMany({ where: { stageId }, include: { sides: { include: { participants: { include: { player: true, team: true } } } } } });
  const standings = calculateStandings(matches.map((match) => ({
    id: match.id,
    status: match.status,
    playerOneScore: match.playerOneScore,
    playerTwoScore: match.playerTwoScore,
    winnerSideId: match.winnerSideId,
    rulesSnapshot: match.rulesSnapshot,
    sides: match.sides.map((side) => ({
      id: side.id,
      sideKey: side.sideKey,
      score: side.score,
      participants: side.participants.map((participant) => ({
        playerId: participant.playerId,
        teamId: participant.teamId,
        displayName: participant.displayName,
        player: participant.player ? { gamertag: participant.player.gamertag } : null,
        team: participant.team ? { name: participant.team.name } : null,
      })),
    })),
  })));
  const results: Array<{ slotId: string; targetMatchId: string; targetSideKey: string }> = [];
  for (const slot of slots) {
    const row = standings.find((standing) => standing.rank === slot.sourceRank);
    if (!row) continue;
    const matchSide = await tx.matchSide.findFirst({ where: { matchId: slot.targetMatchId, sideKey: slot.targetSideKey } });
    if (!matchSide) continue;
    const existingParticipants = await tx.matchSideParticipant.findMany({ where: { matchSideId: matchSide.id } });
    if (existingParticipants.length) continue;
    const [kind, value] = row.key.split(":", 2);
    if (kind === "team" && value) await tx.matchSideParticipant.create({ data: { matchSideId: matchSide.id, teamId: value } });
    else if (kind === "players" && value) {
      const playerIds = value.split(",").filter(Boolean);
      for (const playerId of playerIds) await tx.matchSideParticipant.create({ data: { matchSideId: matchSide.id, playerId } });
    }
    await tx.advancementSlot.update({ where: { id: slot.id }, data: { resolvedAt: new Date() } });
    results.push({ slotId: slot.id, targetMatchId: slot.targetMatchId, targetSideKey: slot.targetSideKey });
  }
  return results;
}
