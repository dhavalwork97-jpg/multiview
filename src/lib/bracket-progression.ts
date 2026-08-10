import type { Prisma, PrismaClient } from "@prisma/client";

// Bracket.structure is stored as JSON (see prisma/schema.prisma comment on
// Bracket) — an ordered array of rounds, each holding an ordered array of
// slots. Match.roundIndex/matchIndex are that same pair of indices, so a
// completed match can find exactly where it sits without re-matching on
// playerIds/round name.
type StructureSlot = {
  playerOneId: string | null;
  playerTwoId: string | null;
  round: string;
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
 * Single/double elimination both use the same flat round-by-round
 * structure shape, so this works for either — but only handles the
 * straightforward "winner advances to slot floor(matchIndex/2) of the next
 * round" mapping. A real double-elim bracket (loser drops to a losers-side
 * round rather than just advancing) needs a losers-bracket target too;
 * that's not modeled here and would need a second pointer (e.g.
 * `loserNextRoundIndex`/`loserNextMatchIndex`) on Match. Left as a
 * follow-up — single elimination (what prisma/seed-demo.ts generates
 * today) is fully handled.
 */
export async function advanceBracket(
  tx: TxClient,
  completedMatch: {
    id: string;
    tournamentId: string;
    bracketId: string | null;
    winnerId: string | null;
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
  const nextRoundIndex = completedMatch.roundIndex + 1;
  const nextRound = rounds[nextRoundIndex];
  if (!nextRound) return null; // completedMatch was the final — nothing to advance into

  const nextMatchIndex = Math.floor(completedMatch.matchIndex / 2);
  const slot = nextRound.matches[nextMatchIndex];
  if (!slot) return null; // structure doesn't declare this slot — nothing to write into

  const slotKey = completedMatch.matchIndex % 2 === 0 ? "playerOneId" : "playerTwoId";
  slot[slotKey] = completedMatch.winnerId;

  await tx.bracket.update({
    where: { id: bracket.id },
    data: { structure: rounds as unknown as Prisma.InputJsonValue },
  });

  if (!slot.playerOneId || !slot.playerTwoId) {
    // Still waiting on the other feeder match — nothing to instantiate yet.
    return null;
  }

  const existing = await tx.match.findFirst({
    where: { bracketId: bracket.id, roundIndex: nextRoundIndex, matchIndex: nextMatchIndex },
  });

  if (existing) {
    // Shouldn't normally happen (a slot only gets both players once), but
    // if this runs twice for any reason, make it idempotent rather than
    // erroring or creating a duplicate Match.
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
      round: slot.round ?? nextRound.name,
      status: "QUEUED",
      roundIndex: nextRoundIndex,
      matchIndex: nextMatchIndex,
    },
  });
  return { id: created.id, isNew: true };
}
