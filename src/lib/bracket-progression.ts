import type { Prisma, PrismaClient } from "@prisma/client";

// Bracket.structure is stored as JSON (see prisma/schema.prisma comment on
// Bracket) — an ordered array of rounds, each holding an ordered array of
// slots. Match.roundIndex/matchIndex are that same pair of indices, so a
// completed match can find exactly where it sits without re-matching on
// playerIds/round name.
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
 * Call after a match transitions to COMPLETED with a winnerId. Writes that
 * winner into the correct slot of the next round in Bracket.structure, and —
 * once both slots of that next-round match are filled — creates (or, if it
 * somehow already exists, updates) the real Match row for it, exactly the
 * way POST /api/brackets does at import time for slots that start out with
 * both players already known.
 *
 * This is the single biggest missing feature called out in the upgrade
 * brief: previously nothing connected "a match reports a winner" to "the
 * bracket structure updates" at all — advancing rounds had to happen by
 * hand (deleting/recreating brackets, or direct DB edits).
 *
 * Existing single-elimination brackets keep the automatic winner-to-next
 * slot fallback. Imported double-elimination brackets can provide explicit
 * `winnerTarget` and `loserTarget` pointers in each slot, allowing winners
 * and losers to feed completely different rounds without hard-coded bracket
 * math.
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
  }
): Promise<{ id: string; isNew: boolean } | null> {
  if (
    !completedMatch.bracketId ||
    !completedMatch.winnerId ||
    completedMatch.roundIndex == null ||
    completedMatch.matchIndex == null
  ) {
    return null;
  }

  const bracket = await tx.bracket.findUnique({ where: { id: completedMatch.bracketId } });
  if (!bracket) return null;

  const rounds = bracket.structure as unknown as StructureRound[];
  const currentRound = rounds[completedMatch.roundIndex];
  const currentSlot = currentRound?.matches?.[completedMatch.matchIndex];
  const loserId = completedMatch.playerOneId === completedMatch.winnerId
    ? completedMatch.playerTwoId
    : completedMatch.playerOneId;

  const writeTarget = (target: Target | undefined, playerId: string) => {
    if (!target) return null;
    const targetRound = rounds[target.roundIndex];
    const targetSlot = targetRound?.matches?.[target.matchIndex];
    if (!targetSlot) return null;
    targetSlot[target.slot] = playerId;
    return { roundIndex: target.roundIndex, matchIndex: target.matchIndex, slot: targetSlot };
  };

  const winnerTarget = currentSlot?.winnerTarget ?? {
    roundIndex: completedMatch.roundIndex + 1,
    matchIndex: Math.floor(completedMatch.matchIndex / 2),
    slot: (completedMatch.matchIndex % 2 === 0 ? "playerOneId" : "playerTwoId") as "playerOneId" | "playerTwoId",
  };
  const winnerWritten = writeTarget(winnerTarget, completedMatch.winnerId);
  const loserWritten = writeTarget(currentSlot?.loserTarget, loserId);
  if (!winnerWritten && !loserWritten) return null;

  await tx.bracket.update({
    where: { id: bracket.id },
    data: { structure: rounds as unknown as Prisma.InputJsonValue },
  });

  const readyTargets = [winnerWritten, loserWritten].filter(Boolean) as Array<{ roundIndex: number; matchIndex: number; slot: StructureSlot }>;
  for (const targetForMatch of readyTargets) {
    const slot = targetForMatch.slot;
    if (!slot.playerOneId || !slot.playerTwoId) continue;
    const targetRoundIndex = targetForMatch.roundIndex;
    const targetMatchIndex = targetForMatch.matchIndex;
    const targetRound = rounds[targetRoundIndex];

    const existing = await tx.match.findFirst({
      where: { bracketId: bracket.id, roundIndex: targetRoundIndex, matchIndex: targetMatchIndex },
    });

    if (existing) {
      await tx.match.update({
        where: { id: existing.id },
        data: { playerOneId: slot.playerOneId, playerTwoId: slot.playerTwoId },
      });
      return { id: existing.id, isNew: false };
    }

    const created = await tx.match.create({
      data: {
        tournamentId: completedMatch.tournamentId,
        bracketId: bracket.id,
        playerOneId: slot.playerOneId,
        playerTwoId: slot.playerTwoId,
        round: slot.round ?? targetRound?.name,
        status: "QUEUED",
        roundIndex: targetRoundIndex,
        matchIndex: targetMatchIndex,
      },
    });
    return { id: created.id, isNew: true };
  }
  return null;
}
