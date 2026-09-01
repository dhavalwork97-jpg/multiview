export type CompetitionType =
  | "tournament"
  | "league"
  | "season"
  | "showmatch"
  | "scrim"
  | "challenge"
  | "custom";

export type ParticipantMode =
  | "individual"
  | "team"
  | "pair"
  | "mixed";

export type SportCategory =
  | "esports"
  | "fighting"
  | "football"
  | "basketball"
  | "cricket"
  | "tennis"
  | "badminton"
  | "volleyball"
  | "table-tennis"
  | "racing"
  | "skills"
  | "bgmi"
  | "custom";

export type CompetitionCapability =
  | "live_scoring"
  | "standings"
  | "brackets"
  | "round_robin"
  | "swiss"
  | "battle_royale"
  | "time_trial"
  | "team_roster";

export interface CompetitionDefinition {
  sport: SportCategory;
  label: string;
  competitionType: CompetitionType;
  participantMode: ParticipantMode;
  scoringAdapter: string;
  bestOf: number;
  capabilities: CompetitionCapability[];
  rules: Record<string, unknown>;
}