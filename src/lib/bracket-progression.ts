import type { Prisma, PrismaClient } from "@prisma/client";
import { createGenericMatch } from "./match-engine/persistence";

type Target = { roundIndex: number; matchIndex: number; slot: "playerOneId" | "playerTwoId" | "sideA" | "sideB" };
type ParticipantRef = { playerId?: string; teamId?: string; role?: string; displayName?: string };
type StructureSlot = {
  playerOneId: string | null;
  playerTwoId: string | null;
  round: string;
  winnerTarget?: Target;
  loserTarget?: Target;
  sideA?: ParticipantRef[];
  sideB?: ParticipantRef[];
};
type StructureRound = { name: string; matches: StructureSlot[] };
type TxClient = PrismaClient | Prisma.TransactionClient;

function refsFromSide(side: { participants: Array<{ playerId: string | null; teamId: string | null; role: string | null; displayName: string | null }> }): ParticipantRef[] {
  return side.participants.map((p) => ({
    ...(p.playerId ? { playerId: p.playerId } : {}),
    ...(p.teamId ? { teamId: p.teamId } : {}),
    ...(p.role ? { role: p.role } : {}),
    ...(p.displayName ? { displayName: p.displayName } : {}),
  }));
}

function refsFromLegacy(playerId: string | null): ParticipantRef[] {
  return playerId ? [{ playerId }] : [];
}

function putSide(slot: StructureSlot, target: "sideA" | "sideB", refs: ParticipantRef[]) {
  slot[target] = refs;
  // Keep legacy projections populated whenever the side is a single player.
  const firstPlayer = refs.find((ref) => ref.playerId)?.playerId ?? null;
  if (target === "sideA") slot.playerOneId = firstPlayer;
  if (target === "sideB") slot.playerTwoId = firstPlayer;
}

function getSideRefs(slot: StructureSlot, side: "A" | "B"): ParticipantRef[] {
  const generic = side === "A" ? slot.sideA : slot.sideB;
  if (generic?.length) return generic;
  return side === "A" ? refsFromLegacy(slot.playerOneId) : refsFromLegacy(slot.playerTwoId);
}

/**
 * Generic bracket progression.
 *
 * The bracket topology remains JSON so imported formats can stay flexible, but
 * match participants are now the source of truth. A completed match can feed
 * a player, a team, a doubles pair, or any custom side into the next match.
 * Legacy playerOne/playerTwo projections are kept for old consumers.
 */
export async function advanceBracket(
  tx: TxClient,
  completedMatch: {
    id: string;
    tournamentId: string;
    bracketId: string | null;
    winnerId: string | null;
    winnerSideId?: string | null;
    playerOneId: string | null;
    playerTwoId: string | null;
    roundIndex: number | null;
    matchIndex: number | null;
    sides?: Array<{
      id: string;
      sideKey: string;
      participants: Array<{ playerId: string | null; teamId: string | null; role: string | null; displayName: string | null }>;
    }>;
  },
): Promise<{ id: string; isNew: boolean }[]> {
  if (!completedMatch.bracketId || completedMatch.roundIndex == null || completedMatch.matchIndex == null) return [];

  const bracket = await tx.bracket.findUnique({ where: { id: completedMatch.bracketId } });
  if (!bracket) return [];
  const tournament = await tx.tournament.findUnique({ where: { id: completedMatch.tournamentId }, select: { sport: true, competitionRules: true } });
  const rounds = bracket.structure as unknown as StructureRound[];
  const currentRound = rounds[completedMatch.roundIndex];
  const currentSlot = currentRound?.matches?.[completedMatch.matchIndex];
  if (!currentSlot) return [];

  const matchSides = completedMatch.sides ?? [];
  const sideA = matchSides.find((side) => side.sideKey === "A");
  const sideB = matchSides.find((side) => side.sideKey === "B");
  const resolvedA = sideA ? refsFromSide(sideA) : getSideRefs(currentSlot, "A");
  const resolvedB = sideB ? refsFromSide(sideB) : getSideRefs(currentSlot, "B");
  const winnerIsA = completedMatch.winnerSideId
    ? completedMatch.winnerSideId === (sideA as any)?.id
    : completedMatch.winnerId != null && completedMatch.winnerId === completedMatch.playerOneId;
  const winner = winnerIsA ? resolvedA : resolvedB;
  const loser = winnerIsA ? resolvedB : resolvedA;

  // Prefer explicit targets. For normal single-elimination brackets the
  // historical positional target remains the fallback.
  const winnerTarget = currentSlot.winnerTarget ?? {
    roundIndex: completedMatch.roundIndex + 1,
    matchIndex: Math.floor(completedMatch.matchIndex / 2),
    slot: (completedMatch.matchIndex % 2 === 0 ? "sideA" : "sideB") as "sideA" | "sideB",
  };

  const targets: Array<{ target: Target; participants: ParticipantRef[] }> = [{ target: winnerTarget, participants: winner }];
  if (currentSlot.loserTarget) targets.push({ target: currentSlot.loserTarget, participants: loser });

  const touched = new Map<string, { roundIndex: number; matchIndex: number; slot: StructureSlot }>();
  for (const { target, participants } of targets) {
    const targetRound = rounds[target.roundIndex];
    const targetSlot = targetRound?.matches?.[target.matchIndex];
    if (!targetSlot) continue;
    if (target.slot === "sideA" || target.slot === "sideB") {
      putSide(targetSlot, target.slot, participants);
    } else {
      const playerId = participants.find((p) => p.playerId)?.playerId ?? null;
      targetSlot[target.slot] = playerId;
      if (target.slot === "playerOneId") {
        targetSlot.sideA = participants;
        targetSlot.playerOneId = playerId;
      } else {
        targetSlot.sideB = participants;
        targetSlot.playerTwoId = playerId;
      }
    }
    touched.set(`${target.roundIndex}:${target.matchIndex}`, { roundIndex: target.roundIndex, matchIndex: target.matchIndex, slot: targetSlot });
  }
  if (!touched.size) return [];

  await tx.bracket.update({ where: { id: bracket.id }, data: { structure: rounds as unknown as Prisma.InputJsonValue } });

  const results: { id: string; isNew: boolean }[] = [];
  for (const target of touched.values()) {
    const slot = target.slot;
    const refsA = getSideRefs(slot, "A");
    const refsB = getSideRefs(slot, "B");
    if (!refsA.length || !refsB.length) continue;

    const existing = await tx.match.findFirst({
      where: { bracketId: bracket.id, roundIndex: target.roundIndex, matchIndex: target.matchIndex },
      include: { sides: { include: { participants: true } } },
    });

    if (existing) {
      if (existing.status === "QUEUED") {
        for (const key of ["A", "B"] as const) {
          const refs = key === "A" ? refsA : refsB;
          const sideId = `side_${existing.id}_${key}`;
          const currentSide = existing.sides.find((side) => side.sideKey === key);
          const side = currentSide ?? await tx.matchSide.create({
            data: { id: sideId, matchId: existing.id, sideKey: key, label: `Side ${key}` },
          });
          await tx.matchParticipant.deleteMany({ where: { sideId: side.id } });
          for (const ref of refs) {
            await tx.matchParticipant.create({
              data: {
                sideId: side.id,
                playerId: ref.playerId,
                teamId: ref.teamId,
                role: ref.role,
                displayName: ref.displayName,
              },
            });
          }
          await tx.matchSide.update({ where: { id: side.id }, data: { score: 0 } });
        }
        await tx.match.update({
          where: { id: existing.id },
          data: {
            playerOneId: refsA.find((p) => p.playerId)?.playerId ?? null,
            playerTwoId: refsB.find((p) => p.playerId)?.playerId ?? null,
            playerOneScore: 0,
            playerTwoScore: 0,
            winnerId: null,
            winnerSideId: null,
          },
        });
        results.push({ id: existing.id, isNew: false });
      }
      continue;
    }

    const created = await createGenericMatch(tx, {
      tournamentId: completedMatch.tournamentId,
      bracketId: bracket.id,
      round: slot.round ?? rounds[target.roundIndex]?.name,
      sport: tournament?.sport,
      rules: (tournament?.competitionRules ?? null) as any,
      sides: [
        { key: "A", label: "Side A", participants: refsA },
        { key: "B", label: "Side B", participants: refsB },
      ],
    });
    await tx.match.update({ where: { id: created.id }, data: { roundIndex: target.roundIndex, matchIndex: target.matchIndex } });
    results.push({ id: created.id, isNew: true });
  }
  return results;
}
