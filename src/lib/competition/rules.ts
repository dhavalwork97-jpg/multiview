import { getCompetitionDefinition } from "./registry";

export function buildCompetitionRules(
  sport: string,
  overrides: Record<string, unknown> = {},
) {
  const definition = getCompetitionDefinition(sport);

  const defaultDirection =
    definition.scoringAdapter === "time" ||
    definition.scoringAdapter === "attempts"
      ? "lower_wins"
      : "higher_wins";

  return {
    sport: definition.sport,
    competitionType: definition.competitionType,
    participantMode: definition.participantMode,
    scoringAdapter: definition.scoringAdapter,
    bestOf: definition.bestOf,
    direction: defaultDirection,
    ...definition.rules,
    ...overrides,
    engine: "fgc-v31",
    version: 2,
  };
}

export function validateCompetitionRules(
  sport: string,
  rules: Record<string, unknown>,
) {
  const definition = getCompetitionDefinition(sport);

  return {
    ...buildCompetitionRules(sport),
    ...rules,
    scoringAdapter:
      (rules.scoringAdapter as string | undefined) ??
      definition.scoringAdapter,
  };
}