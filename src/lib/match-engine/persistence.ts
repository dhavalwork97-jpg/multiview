import type { Prisma, PrismaClient } from "@prisma/client";
import { resolveRules, validateSides } from "./index";
import type { MatchRules, SideInput } from "./types";

type Tx = PrismaClient | Prisma.TransactionClient;

function sideId(matchId: string, key: string) {
  return `side_${matchId}_${key}`;
}

export async function createGenericMatch(
  tx: Tx,
  input: {
    tournamentId: string;
    bracketId?: string;
    stationId?: string;
    round?: string;
    sport?: string;
    rules?: MatchRules | null;
    sides: SideInput[];
    scoringAdapter?: string;
  },
) {
  validateSides(input.sides);
  const rules = resolveRules(input.sport, input.rules);
  const adapter = input.scoringAdapter ?? rules.scoringAdapter ?? "points";

  const match = await tx.match.create({
    data: {
      tournamentId: input.tournamentId,
      bracketId: input.bracketId,
      stationId: input.stationId,
      round: input.round,
      status: "QUEUED",
      engineVersion: "1",
      scoringAdapter: adapter,
      rulesSnapshot: rules as Prisma.InputJsonValue,
    },
  });

  for (const side of input.sides) {
    const createdSide = await tx.matchSide.create({
      data: {
        id: sideId(match.id, side.key),
        matchId: match.id,
        sideKey: side.key,
        label: side.label,
      },
    });
    for (const participant of side.participants) {
      await tx.matchParticipant.create({
        data: {
          sideId: createdSide.id,
          playerId: participant.playerId,
          teamId: participant.teamId,
          role: participant.role,
          displayName: participant.displayName,
        },
      });
    }
  }

  return tx.match.findUniqueOrThrow({
    where: { id: match.id },
    include: { sides: { include: { participants: true } } },
  });
}
