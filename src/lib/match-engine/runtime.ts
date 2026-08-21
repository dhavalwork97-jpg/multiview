import { PrismaClient, MatchStatus, Prisma } from "@prisma/client";
import {
  validateSides,
  resolveRules,
  getScoringAdapter,
} from "./index";

const prisma = new PrismaClient();

type Tx = Prisma.TransactionClient;

type RuntimeSideKey = "A" | "B";

type ScoreEventInput = {
  sideKey: RuntimeSideKey;
  metric: string;
  value: number;
  period?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * V31.2 Runtime Match State Engine
 *
 * State flow:
 *
 * QUEUED -> LIVE -> COMPLETED
 *
 * Score events are persisted first and the match state is then
 * recalculated from the complete event history.
 */

export async function startMatch(matchId: string) {
  return prisma.$transaction(
    async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          sides: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      if (match.status === MatchStatus.COMPLETED) {
        throw new Error("Completed matches cannot be started again.");
      }

      if (match.status === MatchStatus.LIVE) {
        return match;
      }

      validateSides(
        match.sides.map((side) => ({
          key: side.sideKey as RuntimeSideKey,
          label: side.label ?? undefined,
          participants: side.participants.map((participant) => ({
            playerId: participant.playerId ?? undefined,
            teamId: participant.teamId ?? undefined,
            role: participant.role ?? undefined,
            displayName: participant.displayName ?? undefined,
          })),
        }))
      );

      return tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.LIVE,
          startedAt: match.startedAt ?? new Date(),
        },
      });
    },
    {
      timeout: 15000,
    },
  );
}

export async function recordScoreEvent(
  matchId: string,
  input: ScoreEventInput,
) {
  return prisma.$transaction(
    async (tx) => {
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
          key: side.sideKey as RuntimeSideKey,
          label: side.label ?? undefined,
          participants: side.participants.map((participant) => ({
            playerId: participant.playerId ?? undefined,
            teamId: participant.teamId ?? undefined,
            role: participant.role ?? undefined,
            displayName: participant.displayName ?? undefined,
          })),
        }))
      );

      if (!Number.isInteger(input.value)) {
        throw new Error("Score event value must be an integer");
      }

      if (input.value < 0) {
        throw new Error("Score event value cannot be negative");
      }

      const rules = resolveRules(
        getSportFromRules(match.rulesSnapshot),
        {
          ...getRulesSnapshot(match.rulesSnapshot),
          scoringAdapter: match.scoringAdapter,
        },
      );

      const adapter = getScoringAdapter(rules.scoringAdapter);

      if (!adapter.acceptsMetric(input.metric, rules)) {
        throw new Error(
          `Metric '${input.metric}' is not supported by ${adapter.id}`,
        );
      }

      const side = match.sides.find(
        (candidate) => candidate.sideKey === input.sideKey,
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
    },
    {
      timeout: 15000,
    },
  );
}

export async function recalculateMatch(
  matchId: string,
  tx: Tx,
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
        orderBy: {
          sequence: "asc",
        },
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
    },
  );

  const adapter = getScoringAdapter(rules.scoringAdapter);

  const sideStates = match.sides.map((side) => ({
    key: side.sideKey as RuntimeSideKey,
    score: side.score,
    events: match.scoreEvents
      .filter((event) => event.sideId === side.id)
      .map((event) => ({
        sequence: event.sequence,
        sideKey: side.sideKey as RuntimeSideKey,
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
    rules,
  );

  await tx.matchSide.update({
    where: {
      id: match.sides.find(
        (side) => side.sideKey === "A",
      )!.id,
    },
    data: {
      score: scoreA,
    },
  });

  await tx.matchSide.update({
    where: {
      id: match.sides.find(
        (side) => side.sideKey === "B",
      )!.id,
    },
    data: {
      score: scoreB,
    },
  });

  if (outcome.completed && outcome.winnerSideKey) {
    return completeMatch(
      matchId,
      outcome.winnerSideKey,
      tx,
    );
  }

  return getMatchState(matchId, tx);
}

export async function completeMatch(
  matchId: string,
  winnerSideKey: RuntimeSideKey,
  tx: Tx,
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

  if (match.status === MatchStatus.COMPLETED) {
    return match;
  }

  if (match.status !== MatchStatus.LIVE) {
    throw new Error(
      "Only live matches can be completed.",
    );
  }

  const winnerSide = match.sides.find(
    (side) => side.sideKey === winnerSideKey,
  );

  if (!winnerSide) {
    throw new Error("Winner side not found");
  }

  return tx.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.COMPLETED,
      winnerSideId: winnerSide.id,
      endedAt: new Date(),
    },
  });
}

export async function getMatchState(
  matchId: string,
  tx: Tx | PrismaClient = prisma,
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

function getRulesSnapshot(
  snapshot: Prisma.JsonValue | null,
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

function getSportFromRules(
  snapshot: Prisma.JsonValue | null,
): string | undefined {
  const rules = getRulesSnapshot(snapshot);

  return typeof rules.sport === "string"
    ? rules.sport
    : undefined;
}