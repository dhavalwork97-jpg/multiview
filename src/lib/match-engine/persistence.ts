import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveRules, validateSides } from "./index";
import type { SideInput } from "./types";

type DbClient = typeof db | Prisma.TransactionClient;

export type CreateGenericMatchInput = {
  tournamentId: string;
  bracketId?: string;
  stageId?: string;
  stationId?: string;
  round?: string;
  sport?: string;
  scoringAdapter?: string;
  rules?: Record<string, unknown> | null;
  sides: SideInput[];
};

/**
 * V31.1.5
 *
 * Generic match persistence.
 *
 * - Uses the shared Prisma client.
 * - Reuses an existing transaction when supplied.
 * - Never creates nested transactions.
 * - Uses `sideId` for MatchParticipant.
 * - Keeps match + sides + participants atomic.
 */
export async function createGenericMatch(
  txOrInput: DbClient | CreateGenericMatchInput,
  maybeInput?: CreateGenericMatchInput,
) {
  const tx =
    maybeInput === undefined
      ? db
      : (txOrInput as Prisma.TransactionClient);

  const input =
    maybeInput === undefined
      ? (txOrInput as CreateGenericMatchInput)
      : maybeInput;

  const rules = resolveRules(input.sport, {
    ...(input.rules ?? {}),
    ...(input.scoringAdapter
      ? { scoringAdapter: input.scoringAdapter }
      : {}),
  });

  validateSides(input.sides);

  const createMatch = async (client: DbClient) => {
    const match = await client.match.create({
      data: {
        tournamentId: input.tournamentId,
        bracketId: input.bracketId,
        stageId: input.stageId,
        stationId: input.stationId,
        round: input.round,
        status: "QUEUED",
        engineVersion: "v31.1.5",
        scoringAdapter: rules.scoringAdapter ?? "points",
        rulesSnapshot: rules as Prisma.InputJsonValue,
      },
    });

    for (const side of input.sides) {
      const createdSide = await client.matchSide.create({
        data: {
          matchId: match.id,
          sideKey: side.key,
          label: side.label,
          score: 0,
        },
      });

      if (side.participants.length > 0) {
        await client.matchParticipant.createMany({
          data: side.participants.map((participant) => ({
            sideId: createdSide.id,
            playerId: participant.playerId ?? null,
            teamId: participant.teamId ?? null,
            role: participant.role ?? null,
            displayName: participant.displayName ?? null,
          })),
        });
      }
    }

    return client.match.findUniqueOrThrow({
      where: {
        id: match.id,
      },
      include: {
        sides: {
          include: {
            participants: true,
          },
        },
      },
    });
  };

  // Existing transaction supplied by caller.
  // Reuse it; never create a nested transaction.
  if (maybeInput !== undefined) {
    return createMatch(tx);
  }

  // Standalone caller.
  return db.$transaction(
    async (transaction) => createMatch(transaction),
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
}