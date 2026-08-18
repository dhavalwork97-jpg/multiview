import { getScoringAdapter } from "./adapters";
import type { MatchOutcome, MatchRules, ParticipantInput, ScoreEvent, SideInput, SideKey, SideState } from "./types";

export * from "./types";
export * from "./adapters";

export const DEFAULT_RULES: MatchRules = {
  scoringAdapter: "points",
  bestOf: 1,
  winCondition: "highest_score",
  allowDraw: false,
};

export const SPORT_DEFAULTS: Record<string, MatchRules> = {
  fighting: { scoringAdapter: "rounds", bestOf: 3, winCondition: "highest_score", allowedMetrics: ["rounds"] },
  football: { scoringAdapter: "goals", bestOf: 1, winCondition: "highest_score", allowedMetrics: ["goals"] },
  basketball: { scoringAdapter: "points", bestOf: 1, winCondition: "highest_score", allowedMetrics: ["points"] },
  cricket: { scoringAdapter: "runs", bestOf: 1, winCondition: "highest_score", allowedMetrics: ["runs"] },
  tennis: { scoringAdapter: "sets", bestOf: 3, winCondition: "highest_score", allowedMetrics: ["sets"] },
  badminton: { scoringAdapter: "games", bestOf: 3, winCondition: "highest_score", allowedMetrics: ["games"] },
  table_tennis: { scoringAdapter: "games", bestOf: 5, winCondition: "highest_score", allowedMetrics: ["games"] },
  volleyball: { scoringAdapter: "sets", bestOf: 5, winCondition: "highest_score", allowedMetrics: ["sets"] },
  valorant: { scoringAdapter: "rounds", bestOf: 1, winCondition: "highest_score", allowedMetrics: ["rounds"] },
  bgmi: { scoringAdapter: "battle_royale", bestOf: 1, winCondition: "highest_score", allowedMetrics: ["placement", "kills", "points"], weights: { placement: 0, kills: 1, points: 1 } },
  esports: { scoringAdapter: "points", bestOf: 1, winCondition: "highest_score", allowedMetrics: ["points"] },
  custom: { scoringAdapter: "custom", bestOf: 1, winCondition: "explicit", allowDraw: false },
};

export function resolveRules(sport: string | undefined, rules?: MatchRules | null): MatchRules {
  return { ...DEFAULT_RULES, ...(SPORT_DEFAULTS[sport ?? "custom"] ?? SPORT_DEFAULTS.custom), ...(rules ?? {}) };
}

export function validateParticipant(participant: ParticipantInput): void {
  const count = Number(Boolean(participant.playerId)) + Number(Boolean(participant.teamId));
  if (count !== 1) throw new Error("Each match participant must reference exactly one player or team");
}

export function validateSides(sides: SideInput[]): void {
  if (sides.length !== 2) throw new Error("A match must contain exactly Side A and Side B");
  const keys = new Set(sides.map((s) => s.key));
  if (!keys.has("A") || !keys.has("B")) throw new Error("Match sides must be keyed A and B");
  for (const side of sides) {
    if (side.participants.length < 1) throw new Error(`Side ${side.key} must contain at least one participant`);
    side.participants.forEach(validateParticipant);
  }
}

export function emptySideState(key: SideKey, score = 0, events: ScoreEvent[] = []): SideState {
  return { key, score, events };
}

export function resolveOutcome(a: SideState, b: SideState, rules: MatchRules): MatchOutcome {
  const adapter = getScoringAdapter(rules.scoringAdapter);
  return adapter.resolve(a, b, rules);
}

export function validateScoreEvent(event: { metric: string; value: number }, rules: MatchRules): void {
  if (!Number.isInteger(event.value)) throw new Error("Score event value must be an integer");
  if (event.value < 0) throw new Error("Score event value cannot be negative");
  const adapter = getScoringAdapter(rules.scoringAdapter);
  if (!adapter.acceptsMetric(event.metric, rules)) throw new Error(`Metric '${event.metric}' is not supported by ${adapter.id}`);
}
