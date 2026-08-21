import {
  buildCompetitionRules,
  getCompetitionDefinition,
  listCompetitionDefinitions,
} from "@/lib/competition";

export type ParticipantMode =
  | "individual"
  | "team"
  | "pair"
  | "mixed";

export type CompetitionPreset = ReturnType<
  typeof getCompetitionDefinition
>;

export function getCompetitionPreset(
  sport: string,
): CompetitionPreset {
  return getCompetitionDefinition(sport);
}

export function getCompetitionPresets(): CompetitionPreset[] {
  return listCompetitionDefinitions();
}

/**
 * Build the complete normalized competition configuration.
 *
 * The registry is authoritative for defaults.
 * Explicit tournament values are allowed to override them.
 */
export function normalizeRules(
  sport: string,
  scoringMode?: string,
  bestOf?: number,
  customRules?: Record<string, unknown>,
) {
  const preset = getCompetitionDefinition(sport);

  return buildCompetitionRules(sport, {
    scoringAdapter: scoringMode || preset.scoringAdapter,
    bestOf: bestOf ?? preset.bestOf,
    ...customRules,
  });
}

/**
 * Returns the registry defaults for a sport.
 */
export function getCompetitionDefaults(sport: string) {
  const preset = getCompetitionDefinition(sport);

  return {
    sport: preset.sport,
    label: preset.label,
    competitionType: preset.competitionType,
    participantMode: preset.participantMode,
    scoringAdapter: preset.scoringAdapter,
    bestOf: preset.bestOf,
    capabilities: preset.capabilities,
    rules: preset.rules,
  };
}
