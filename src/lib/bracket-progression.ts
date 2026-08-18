import type { Prisma, PrismaClient } from "@prisma/client";

type Target = { roundIndex: number; matchIndex: number; slot: "playerOneId" | "playerTwoId" };
type StructureSlot = {
  playerOneId: string | null;
  playerTwoId: string | null;
  round: string;
  winnerTarget?: Target;
  loserTarget?: Target;
};
type StructureRound = { name: string; matches: StructureSlot[] };
type TxClient = PrismaClient | Prisma.TransactionClient;

/**
 * Advances one completed match into every ready downstream slot. The old
 * implementation returned after the first ready target, which meant a
 * double-elimination match with both a winnerTarget and loserTarget could
 * silently create only one downstream match. This version updates the JSON
 * bracket and materializes every newly-ready Match row in one transaction.
 */
export async function advanceBracket(
  tx: TxClient,
  completedMatch: {
    id: string;
    tournamentId: string;
    bracketId: string | null;
    winnerId: string | null;
    playerOneId: string;
    playerTwoId: string;
    roundIndex: number | null;
    matchIndex: number | null;
  },
): Promise<{ id: string; isNew: boolean }[]> {
  if (!completedMatch.bracketId || !completedMatch.winnerId || completedMatch.roundIndex == null || completedMatch.matchIndex == null) return [];

  const bracket = await tx.bracket.findUnique({ where: { id: completedMatch.bracketId } });
  if (!bracket) return [];
  const rounds = bracket.structure as unknown as StructureRound[];
  const currentRound = rounds[completedMatch.roundIndex];
  const currentSlot = currentRound?.matches?.[completedMatch.matchIndex];
  if (!currentSlot) return [];

  const loserId = completedMatch.playerOneId === completedMatch.winnerId ? completedMatch.playerTwoId : completedMatch.playerOneId;
  const winnerTarget = currentSlot.winnerTarget ?? {
    roundIndex: completedMatch.roundIndex + 1,
    matchIndex: Math.floor(completedMatch.matchIndex / 2),
    slot: (completedMatch.matchIndex % 2 === 0 ? "playerOneId" : "playerTwoId") as "playerOneId" | "playerTwoId",
  };

  const targets: Array<{ target: Target; playerId: string }> = [{ target: winnerTarget, playerId: completedMatch.winnerId }];
  if (currentSlot.loserTarget) targets.push({ target: currentSlot.loserTarget, playerId: loserId });

  const touched = new Map<string, { roundIndex: number; matchIndex: number; slot: StructureSlot }>();
  for (const { target, playerId } of targets) {
    const targetRound = rounds[target.roundIndex];
    const targetSlot = targetRound?.matches?.[target.matchIndex];
    if (!targetSlot) continue;
    targetSlot[target.slot] = playerId;
    touched.set(`${target.roundIndex}:${target.matchIndex}`, { roundIndex: target.roundIndex, matchIndex: target.matchIndex, slot: targetSlot });
  }
  if (!touched.size) return [];

  await tx.bracket.update({ where: { id: bracket.id }, data: { structure: rounds as unknown as Prisma.InputJsonValue } });

  const results: { id: string; isNew: boolean }[] = [];
  for (const target of touched.values()) {
    const slot = target.slot;
    if (!slot.playerOneId || !slot.playerTwoId) continue;
    const existing = await tx.match.findFirst({ where: { bracketId: bracket.id, roundIndex: target.roundIndex, matchIndex: target.matchIndex } });
    if (existing) {
      if (existing.status === "QUEUED") {
        const updated = await tx.match.update({ where: { id: existing.id }, data: { playerOneId: slot.playerOneId, playerTwoId: slot.playerTwoId } });
        results.push({ id: updated.id, isNew: false });
      }
      continue;
    }
    const created = await tx.match.create({
      data: {
        tournamentId: completedMatch.tournamentId,
        bracketId: bracket.id,
        playerOneId: slot.playerOneId,
        playerTwoId: slot.playerTwoId,
        round: slot.round ?? rounds[target.roundIndex]?.name,
        status: "QUEUED",
        roundIndex: target.roundIndex,
        matchIndex: target.matchIndex,
      },
    });
    results.push({ id: created.id, isNew: true });
  }
  return results;
}
