export type SideKey = "A" | "B";

export type ParticipantInput = {
  playerId?: string;
  teamId?: string;
  role?: string;
  displayName?: string;
};

export type SideInput = {
  key: SideKey;
  label?: string;
  participants: ParticipantInput[];
};

export type ScoreEventInput = {
  sideKey: SideKey;
  metric: string;
  value: number;
  period?: string;
  metadata?: Record<string, unknown>;
};

export type MatchRules = {
  scoringAdapter?: string;
  bestOf?: number;
  winCondition?: "highest_score" | "first_to" | "explicit";
  direction?: "higher_wins" | "lower_wins";
  target?: number;
  allowedMetrics?: string[];
  weights?: Record<string, number>;
  allowDraw?: boolean;
  [key: string]: unknown;
};

export type ScoreEvent = ScoreEventInput & { sequence: number };

export type SideState = {
  key: SideKey;
  score: number;
  events: ScoreEvent[];
};

export type MatchOutcome = {
  winnerSideKey: SideKey | null;
  scores: Record<SideKey, number>;
  isDraw: boolean;
  reason: string;
};

export type ScoringAdapter = {
  id: string;
  label: string;
  acceptsMetric(metric: string, rules: MatchRules): boolean;
  score(side: SideState, rules: MatchRules): number;
  resolve(a: SideState, b: SideState, rules: MatchRules): MatchOutcome;
};
