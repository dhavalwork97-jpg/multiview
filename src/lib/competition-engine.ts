import {
  buildCompetitionRules,
  getCompetitionDefinition,
} from "@/lib/competition";

export type ParticipantMode =
  | "individual"
  | "team"
  | "pair"
  | "mixed";

export type CompetitionPreset = ReturnType<typeof getCompetitionDefinition>;

export function getCompetitionPreset(sport: string): CompetitionPreset {
  return getCompetitionDefinition(sport);
}

export function getCompetitionPresets() {
  return [
    getCompetitionDefinition("esports"),
    getCompetitionDefinition("football"),
    getCompetitionDefinition("basketball"),
    getCompetitionDefinition("cricket"),
    getCompetitionDefinition("tennis"),
    getCompetitionDefinition("badminton"),
    getCompetitionDefinition("volleyball"),
    getCompetitionDefinition("table-tennis"),
    getCompetitionDefinition("racing"),
    getCompetitionDefinition("skills"),
    getCompetitionDefinition("custom"),
  ];
}

export function normalizeRules(
  sport: string,
  scoringMode: string,
  bestOf: number,
  customRules?: Record<string, unknown>,
) {
  return buildCompetitionRules(sport, {
    scoringAdapter: scoringMode,
    bestOf,
    ...customRules,
  });
}