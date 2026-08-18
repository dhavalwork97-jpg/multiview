import type { MatchOutcome, MatchRules, ScoringAdapter, SideState } from "./types";

function highestScore(a: SideState, b: SideState, rules: MatchRules, reason: string): MatchOutcome {
  const aScore = a.score;
  const bScore = b.score;
  if (aScore === bScore) {
    return { winnerSideKey: rules.allowDraw ? null : null, scores: { A: aScore, B: bScore }, isDraw: true, reason };
  }
  return {
    winnerSideKey: aScore > bScore ? "A" : "B",
    scores: { A: aScore, B: bScore },
    isDraw: false,
    reason,
  };
}

function numericAdapter(id: string, label: string, metrics: string[]): ScoringAdapter {
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
      return highestScore(a, b, rules, `${id}: higher aggregate score wins`);
    },
  };
}

export const pointsAdapter = numericAdapter("points", "Points", ["points"]);
export const goalsAdapter = numericAdapter("goals", "Goals", ["goals"]);
export const runsAdapter = numericAdapter("runs", "Runs", ["runs"]);
export const roundsAdapter = numericAdapter("rounds", "Rounds", ["rounds"]);
export const setsAdapter = numericAdapter("sets", "Sets", ["sets"]);
export const gamesAdapter = numericAdapter("games", "Games", ["games"]);

export const battleRoyaleAdapter: ScoringAdapter = {
  id: "battle_royale",
  label: "Battle Royale",
  acceptsMetric(metric, rules) {
    const allowed = rules.allowedMetrics ?? ["placement", "kills", "points"];
    return allowed.includes(metric);
  },
  score(side, rules) {
    const weights: Record<string, number> = { placement: 0, kills: 1, points: 1, ...(rules.weights ?? {}) };
    return side.events.reduce((total, event) => total + event.value * (weights[event.metric] ?? 0), 0);
  },
  resolve(a, b, rules) {
    const aScore = this.score(a, rules);
    const bScore = this.score(b, rules);
    return highestScore({ ...a, score: aScore }, { ...b, score: bScore }, rules, "battle_royale: weighted placement/kills/points");
  },
};

export const customAdapter: ScoringAdapter = {
  id: "custom",
  label: "Custom",
  acceptsMetric() { return true; },
  score(side) { return side.score; },
  resolve(a, b, rules) {
    if (rules.winCondition === "explicit") {
      return { winnerSideKey: null, scores: { A: a.score, B: b.score }, isDraw: a.score === b.score, reason: "custom: explicit winner required" };
    }
    return highestScore(a, b, rules, "custom: configured aggregate score");
  },
};

export const ADAPTERS: Record<string, ScoringAdapter> = {
  points: pointsAdapter,
  goals: goalsAdapter,
  runs: runsAdapter,
  rounds: roundsAdapter,
  sets: setsAdapter,
  games: gamesAdapter,
  battle_royale: battleRoyaleAdapter,
  custom: customAdapter,
};

export function getScoringAdapter(id: string | undefined): ScoringAdapter {
  return ADAPTERS[id ?? "points"] ?? customAdapter;
}
