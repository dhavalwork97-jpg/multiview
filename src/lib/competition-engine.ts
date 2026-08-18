// Backwards-compatible facade for the dynamic competition layer introduced in V25.
// Match mechanics now live in ./match-engine; keep this import path stable for
// existing tournament forms and future integrations.
export {
  COMPETITION_PRESETS,
} from "./match-engine/presets";
export {
  ADAPTERS,
  SPORT_DEFAULTS,
  DEFAULT_RULES,
  getScoringAdapter,
  resolveRules,
  resolveOutcome,
  validateParticipant,
  validateSides,
  validateScoreEvent,
} from "./match-engine";
export type {
  MatchRules,
  ParticipantInput,
  ScoreEventInput,
  SideInput,
  SideKey,
  MatchOutcome,
} from "./match-engine/types";
