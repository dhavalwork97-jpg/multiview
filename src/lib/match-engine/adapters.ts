import type {
  MatchOutcome,
  MatchRules,
  ScoringAdapter,
  SideState,
} from "./types";

const METRICS: Record<string, string[]> = {
  points: ["points"],
  goals: ["goals"],
  runs: ["runs"],
  rounds: ["rounds"],
  sets: ["sets"],
  games: ["games"],
  time: ["milliseconds", "seconds"],
  attempts: ["attempts"],
  battle_royale: ["placement", "kills", "points"],
  custom: [],
};

export function getAdapterMetrics(
  adapter = "points",
  rules: MatchRules = {}
): string[] {
  return rules.allowedMetrics ?? METRICS[adapter] ?? ["points"];
}

export function metricLabel(metric: string): string {
  return metric
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveWinner(
  a: SideState,
  b: SideState,
  rules: MatchRules
): MatchOutcome {
  const aScore = a.events.reduce((t, e) => t + e.value, 0);
  const bScore = b.events.reduce((t, e) => t + e.value, 0);

  if (aScore === bScore) {
    return {
      winnerSideKey: null,
      scores: { A: aScore, B: bScore },
      isDraw: true,
      reason: "Scores tied.",
      completed: false,
    };
  }

  const higherWins = rules.direction !== "lower_wins";

  return {
    winnerSideKey:
      higherWins
        ? aScore > bScore
          ? "A"
          : "B"
        : aScore < bScore
        ? "A"
        : "B",
    scores: { A: aScore, B: bScore },
    isDraw: false,
    reason: "Score comparison.",
    completed: true,
  };
}

function makeAdapter(id: string, label: string): ScoringAdapter {
  return {
    id,
    label,

    acceptsMetric(metric, rules) {
      return getAdapterMetrics(id, rules).includes(metric);
    },

    score(side) {
      // Runtime matches calculate their score from score events.
      // Unit/API callers may provide an already-calculated side.score.
      if (side.events.length > 0) {
        return side.events.reduce((total, event) => total + event.value, 0);
      }

      return side.score;
    },

    resolve(a, b, rules) {
      const aScore = this.score(a, rules);
      const bScore = this.score(b, rules);

      if (aScore === bScore) {
        return {
          winnerSideKey: null,
          scores: { A: aScore, B: bScore },
          isDraw: true,
          reason: "Scores tied.",
          completed: false,
        };
      }

      const higherWins = rules.direction !== "lower_wins";

      return {
        winnerSideKey:
          higherWins
            ? aScore > bScore
              ? "A"
              : "B"
            : aScore < bScore
              ? "A"
              : "B",
        scores: { A: aScore, B: bScore },
        isDraw: false,
        reason: "Score comparison.",
        completed: true,
      };
    },
  };
}

export const scoringAdapters: Record<string, ScoringAdapter> = {
  points: makeAdapter("points", "Points"),
  goals: makeAdapter("goals", "Goals"),
  runs: makeAdapter("runs", "Runs"),
  rounds: makeAdapter("rounds", "Rounds"),
  sets: makeAdapter("sets", "Sets"),
  games: makeAdapter("games", "Games"),
  time: makeAdapter("time", "Time"),
  attempts: makeAdapter("attempts", "Attempts"),
  battle_royale: {
  id: "battle_royale",
  label: "Battle Royale",

  acceptsMetric(metric) {
    return ["placement", "kills", "points"].includes(metric);
  },

  score(side, rules) {
    const weights = {
      placement: Number(rules.weights?.placement ?? 2),
      kills: Number(rules.weights?.kills ?? 1),
      points: Number(rules.weights?.points ?? 1),
    };

    return side.events.reduce((total, event) => {
      const weight =
        weights[event.metric as keyof typeof weights] ?? 1;

      return total + event.value * weight;
    }, 0);
  },

  resolve(a, b, rules) {
    const aScore = this.score(a, rules);
    const bScore = this.score(b, rules);

    if (aScore === bScore) {
      return {
        winnerSideKey: null,
        scores: { A: aScore, B: bScore },
        isDraw: true,
        reason: "Battle Royale tie",
        completed: false,
      };
    }

    return {
      winnerSideKey: aScore > bScore ? "A" : "B",
      scores: { A: aScore, B: bScore },
      isDraw: false,
      reason: "Battle Royale weighted score",
      completed: true,
    };
  },
},
  custom: makeAdapter("custom", "Custom"),
};

export function getScoringAdapter(id?: string): ScoringAdapter {
  return scoringAdapters[id ?? "points"] ?? scoringAdapters.points;
}