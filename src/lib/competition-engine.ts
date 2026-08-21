import {
  buildCompetitionRules,
  getCompetitionDefinition,
} from "@/lib/competition";

export type ParticipantMode =
  | "individual"
  | "team"
  | "pair"
  | "mixed";

export type CompetitionPreset = {
  sport: string;
  label: string;
  participantMode: ParticipantMode;
  scoringMode: string;
  bestOf: number;
  rules: Record<string, unknown>;
};

/**
 * Compatibility shim for existing V29/V30 pages.
 */
export function getCompetitionPreset(sport: string): CompetitionPreset {
  const definition = getCompetitionDefinition(sport);

  return {
    sport: definition.sport,
    label: definition.label,
    participantMode: definition.participantMode,
    scoringMode: definition.scoringAdapter,
    bestOf: definition.bestOf,
    rules: definition.rules,
  };
}

/**
 * Universal rules builder used by tournament creation.
 */
export function normalizeRules(
  sport: string,
  scoringMode: string,
  bestOf: number,
  customRules?: Record<string, unknown>,
) {
  return buildCompetitionRules(sport, {
    scoringAdapter: scoringMode,
    bestOf,
    ...(customRules ?? {}),
  });
}