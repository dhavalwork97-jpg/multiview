import type { MatchOutcome, MatchRules, ScoringAdapter, SideState } from "./types";

function resolveNumeric(
  a: SideState,
  b: SideState,
  rules: MatchRules,
  reason: string,
): MatchOutcome {
  const aScore = a.score;
  const bScore = b.score;

  if (aScore === bScore) {
    return {
      winnerSideKey: null,
      scores: { A: aScore, B: bScore },
      isDraw: true,
      reason,
    };
  }

  const lowerWins = rules.direction === "lower_wins";

  return {
    winnerSideKey:
      lowerWins
        ? aScore < bScore ? "A" : "B"
        : aScore > bScore ? "A" : "B",
    scores: { A: aScore, B: bScore },
    isDraw: false,
    reason,
  };
}

function numericAdapter(
  id: string,
  label: string,
  metrics: string[],
): ScoringAdapter {
  return {
    id,
    label,

    acceptsMetric(metric, rules) {
      const allowed = rules.allowedMetrics ?? metrics;
      return allowed.includes(metric);
    },

    score(side) {
      return side.score;
    },

    resolve(a, b, rules) {
      return resolveNumeric(
        a,
        b,
        rules,
        `${id}: aggregate score`,
      );
    },
  };
}

export const pointsAdapter =
  numericAdapter("points", "Points", ["points"]);

export const goalsAdapter =
  numericAdapter("goals", "Goals", ["goals"]);

export const runsAdapter =
  numericAdapter("runs", "Runs", ["runs"]);

export const roundsAdapter =
  numericAdapter("rounds", "Rounds", ["rounds"]);

export const setsAdapter =
  numericAdapter("sets", "Sets", ["sets"]);

export const gamesAdapter =
  numericAdapter("games", "Games", ["games"]);

export const timeAdapter: ScoringAdapter = {
  id: "time",
  label: "Time",

  acceptsMetric(metric, rules) {
    const allowed = rules.allowedMetrics ?? ["time"];
    return allowed.includes(metric);
  },

  score(side) {
    const events = side.events.filter(
      (event) => event.metric === "time",
    );

    if (events.length === 0) {
      return side.score;
    }

    return events[events.length - 1].value;
  },

  resolve(a, b, rules) {
    return resolveNumeric(
      { ...a, score: timeAdapter.score(a, rules) },
      { ...b, score: timeAdapter.score(b, rules) },
      { ...rules, direction: rules.direction ?? "lower_wins" },
      "time: fastest time wins",
    );
  },
};

export const attemptsAdapter: ScoringAdapter = {
  id: "attempts",
  label: "Attempts",

  acceptsMetric(metric, rules) {
    const allowed = rules.allowedMetrics ?? ["attempts"];
    return allowed.includes(metric);
  },

  score(side) {
    const events = side.events.filter(
      (event) => event.metric === "attempts",
    );

    if (events.length === 0) {
      return side.score;
    }

    return events.reduce(
      (total, event) => total + event.value,
      0,
    );
  },

  resolve(a, b, rules) {
    return resolveNumeric(
      { ...a, score: attemptsAdapter.score(a, rules) },
      { ...b, score: attemptsAdapter.score(b, rules) },
      { ...rules, direction: rules.direction ?? "lower_wins" },
      "attempts: fewer attempts wins",
    );
  },
};

export const battleRoyaleAdapter: ScoringAdapter = {
  id: "battle_royale",
  label: "Battle Royale",

  acceptsMetric(metric, rules) {
    const allowed =
      rules.allowedMetrics ?? [
        "placement",
        "kills",
        "points",
      ];

    return allowed.includes(metric);
  },

  score(side, rules) {
    const weights: Record<string, number> = {
      placement: 0,
      kills: 1,
      points: 1,
      ...(rules.weights ?? {}),
    };

    return side.events.reduce(
      (total, event) =>
        total +
        event.value *
          (weights[event.metric] ?? 0),
      0,
    );
  },

  resolve(a, b, rules) {
    const aScore = this.score(a, rules);
    const bScore = this.score(b, rules);

    return resolveNumeric(
      { ...a, score: aScore },
      { ...b, score: bScore },
      rules,
      "battle_royale: weighted placement/kills/points",
    );
  },
};

export const customAdapter: ScoringAdapter = {
  id: "custom",
  label: "Custom",

  acceptsMetric() {
    return true;
  },

  score(side) {
    return side.score;
  },

  resolve(a, b, rules) {
    if (rules.winCondition === "explicit") {
      return {
        winnerSideKey: null,
        scores: {
          A: a.score,
          B: b.score,
        },
        isDraw: a.score === b.score,
        reason: "custom: explicit winner required",
      };
    }

    return resolveNumeric(
      a,
      b,
      rules,
      "custom: configured aggregate score",
    );
  },
};

export const ADAPTERS: Record<string, ScoringAdapter> = {
  points: pointsAdapter,
  goals: goalsAdapter,
  runs: runsAdapter,
  rounds: roundsAdapter,
  sets: setsAdapter,
  games: gamesAdapter,
  time: timeAdapter,
  attempts: attemptsAdapter,
  battle_royale: battleRoyaleAdapter,
  custom: customAdapter,
};

export function getScoringAdapter(
  id: string | undefined,
): ScoringAdapter {
  return ADAPTERS[id ?? "points"] ?? customAdapter;
}

export function getAdapterMetrics(
  id: string | undefined,
  rules: MatchRules = {},
): string[] {
  const adapter = getScoringAdapter(id);

  const candidates =
    rules.allowedMetrics ??
    (() => {
      switch (adapter.id) {
        case "battle_royale":
          return ["kills", "placement", "points"];

        case "goals":
          return ["goals"];

        case "runs":
          return ["runs"];

        case "rounds":
          return ["rounds"];

        case "sets":
          return ["sets"];

        case "games":
          return ["games"];

        case "time":
          return ["time"];

        case "attempts":
          return ["attempts"];

        case "points":
          return ["points"];

        default:
          return ["points"];
      }
    })();

  return candidates.filter((metric) =>
    adapter.acceptsMetric(metric, rules),
  );
}

export function metricLabel(metric: string): string {
  return metric
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
