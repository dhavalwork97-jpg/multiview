import { PrismaClient, MatchStatus, Prisma } from "@prisma/client";
import {
  validateSides,
  resolveRules,
  getScoringAdapter,
} from "./index";

const prisma = new PrismaClient();

type Tx = Prisma.TransactionClient;

export async function startMatch(matchId: string) {
  return prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.LIVE,
      startedAt: new Date(),
    },
  });
}

export async function recordScoreEvent(
  matchId: string,
  input: {
    sideKey: "A" | "B";
    metric: string;
    value: number;
    period?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        sides: {
          include: {
            participants: true,
          },
        },
        scoreEvents: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.status !== MatchStatus.LIVE) {
      throw new Error("Match is not live.");
    }

    validateSides(
      match.sides.map((side) => ({
        key: side.sideKey as "A" | "B",
        label: side.label ?? undefined,
        participants: side.participants.map((participant) => ({
          playerId: participant.playerId ?? undefined,
          teamId: participant.teamId ?? undefined,
          role: participant.role ?? undefined,
          displayName: participant.displayName ?? undefined,
        })),
      }))
    );

    const rules = resolveRules(
      getSportFromRules(match.rulesSnapshot),
      getRulesSnapshot(match.rulesSnapshot)
    );

    const adapter = getScoringAdapter(rules.scoringAdapter);

    if (!adapter.acceptsMetric(input.metric, rules)) {
      throw new Error(
        `Metric '${input.metric}' is not supported by ${adapter.id}`
      );
    }

    if (!Number.isInteger(input.value)) {
      throw new Error("Score event value must be an integer");
    }

    if (input.value < 0) {
      throw new Error("Score event value cannot be negative");
    }

    const side = match.sides.find(
      (candidate) => candidate.sideKey === input.sideKey
    );

    if (!side) {
      throw new Error("Invalid side");
    }

    const sequence =
      (match.scoreEvents.at(-1)?.sequence ?? 0) + 1;

    await tx.matchScoreEvent.create({
      data: {
        matchId,
        sideId: side.id,
        sequence,
        metric: input.metric,
        value: input.value,
        period: input.period ?? "MAIN",
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });

    return recalculateMatch(matchId, tx);
  });
}

export async function recalculateMatch(
  matchId: string,
  tx: Tx
) {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    include: {
      sides: {
        include: {
          participants: true,
        },
      },
      scoreEvents: {
        include: {
          side: true,
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  const rulesSnapshot = getRulesSnapshot(match.rulesSnapshot);

  const rules = resolveRules(
    getSportFromRules(match.rulesSnapshot),
    {
      ...rulesSnapshot,
      scoringAdapter: match.scoringAdapter,
    }
  );

  const adapter = getScoringAdapter(rules.scoringAdapter);

  const sideStates = match.sides.map((side) => ({
    key: side.sideKey as "A" | "B",
    score: side.score,
    events: match.scoreEvents
      .filter((event) => event.sideId === side.id)
      .map((event) => ({
        sequence: event.sequence,
        sideKey: side.sideKey as "A" | "B",
        metric: event.metric,
        value: event.value,
        period: event.period ?? undefined,
        metadata:
          event.metadata &&
          typeof event.metadata === "object" &&
          !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : undefined,
      })),
  }));

  const sideA = sideStates.find((side) => side.key === "A");
  const sideB = sideStates.find((side) => side.key === "B");

  if (!sideA || !sideB) {
    throw new Error("Match must contain Side A and Side B");
  }

  const scoreA = adapter.score(sideA, rules);
  const scoreB = adapter.score(sideB, rules);

  const outcome = adapter.resolve(
    {
      ...sideA,
      score: scoreA,
    },
    {
      ...sideB,
      score: scoreB,
    },
    rules
  );

  await tx.matchSide.update({
    where: {
      id: match.sides.find((side) => side.sideKey === "A")!.id,
    },
    data: {
      score: scoreA,
    },
  });

  await tx.matchSide.update({
    where: {
      id: match.sides.find((side) => side.sideKey === "B")!.id,
    },
    data: {
      score: scoreB,
    },
  });

  if (outcome.completed && outcome.winnerSideKey) {
    return completeMatch(
      matchId,
      outcome.winnerSideKey,
      tx
    );
  }

  return getMatchState(matchId, tx);
}

export async function completeMatch(
  matchId: string,
  winnerSideKey: "A" | "B",
  tx: Tx
) {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    include: {
      sides: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  const winnerSide = match.sides.find(
    (side) => side.sideKey === winnerSideKey
  );

  return tx.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.COMPLETED,
      winnerSideId: winnerSide?.id ?? null,
      endedAt: new Date(),
    },
  });
}

export async function getMatchState(
  matchId: string,
  tx: Tx | PrismaClient = prisma
) {
  return tx.match.findUnique({
    where: { id: matchId },
    include: {
      sides: {
        include: {
          participants: true,
        },
      },
      scoreEvents: {
        include: {
          side: true,
        },
        orderBy: {
          sequence: "asc",
        },
      },
    },
  });
}

/**
 * Extract the persisted competition rules safely.
 */
function getRulesSnapshot(
  snapshot: Prisma.JsonValue | null
): Record<string, unknown> {
  if (
    snapshot &&
    typeof snapshot === "object" &&
    !Array.isArray(snapshot)
  ) {
    return snapshot as Record<string, unknown>;
  }

  return {};
}

/**
 * The competition rules snapshot stores the sport used
 * to resolve the generic Match Engine rules.
 */
function getSportFromRules(
  snapshot: Prisma.JsonValue | null
): string | undefined {
  const rules = getRulesSnapshot(snapshot);

  return typeof rules.sport === "string"
    ? rules.sport
    : undefined;
}