export type ParticipantMode = "individual" | "team" | "pair" | "mixed";

export type CompetitionPreset = {
  sport: string;
  label: string;
  participantMode: ParticipantMode;
  scoringMode: string;
  bestOf: number;
  rules: Record<string, unknown>;
};

const PRESETS: CompetitionPreset[] = [
  { sport: "esports", label: "Esports / Game", participantMode: "individual", scoringMode: "points", bestOf: 3, rules: { winCondition: "series", pointsPerWin: 1 } },
  { sport: "football", label: "Football / Soccer", participantMode: "team", scoringMode: "goals", bestOf: 1, rules: { winPoints: 3, drawPoints: 1, lossPoints: 0, periodMinutes: 45 } },
  { sport: "basketball", label: "Basketball", participantMode: "team", scoringMode: "points", bestOf: 1, rules: { periodCount: 4, periodMinutes: 10 } },
  { sport: "cricket", label: "Cricket", participantMode: "team", scoringMode: "runs", bestOf: 1, rules: { innings: 1, wickets: 10 } },
  { sport: "tennis", label: "Tennis", participantMode: "individual", scoringMode: "sets", bestOf: 3, rules: { setsToWin: 2, tiebreak: true } },
  { sport: "badminton", label: "Badminton", participantMode: "individual", scoringMode: "sets", bestOf: 3, rules: { setsToWin: 2, pointsPerSet: 21 } },
  { sport: "volleyball", label: "Volleyball", participantMode: "team", scoringMode: "sets", bestOf: 5, rules: { setsToWin: 3, pointsPerSet: 25, finalSetPoints: 15 } },
  { sport: "table-tennis", label: "Table Tennis", participantMode: "individual", scoringMode: "sets", bestOf: 5, rules: { setsToWin: 3, pointsPerSet: 11 } },
  { sport: "custom", label: "Custom Competition", participantMode: "mixed", scoringMode: "points", bestOf: 1, rules: { metric: "points", direction: "higher_wins" } },
];

export function getCompetitionPresets() { return PRESETS; }
export function getCompetitionPreset(sport: string) { return PRESETS.find((p) => p.sport === sport) ?? PRESETS.find((p) => p.sport === "custom")!; }

export function normalizeRules(sport: string, scoringMode: string, bestOf: number, customRules?: Record<string, unknown>) {
  const preset = getCompetitionPreset(sport);
  return { ...preset.rules, ...customRules, sport, scoringMode, bestOf, engine: "generic-match-engine", version: 1 };
}
