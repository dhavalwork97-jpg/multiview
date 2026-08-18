export type CompetitionPreset = {
  id: string;
  label: string;
  category: string;
  participantLabel: string;
  scoringMode: string;
  defaultFormat: string;
  formats: string[];
  defaultBestOf: number;
  rules: Record<string, unknown>;
};

export const COMPETITION_PRESETS: CompetitionPreset[] = [
  {
    id: "fighting",
    label: "Fighting / 1v1",
    category: "Esports",
    participantLabel: "Players",
    scoringMode: "rounds",
    defaultFormat: "single_elimination",
    formats: ["single_elimination", "double_elimination", "round_robin"],
    defaultBestOf: 3,
    rules: { unit: "round", pointsPerWin: 1, bestOf: 3 },
  },
  {
    id: "football",
    label: "Football / Soccer",
    category: "Team Sport",
    participantLabel: "Teams",
    scoringMode: "goals",
    defaultFormat: "round_robin",
    formats: ["round_robin", "single_elimination", "groups_knockout"],
    defaultBestOf: 1,
    rules: { unit: "goal", winPoints: 3, drawPoints: 1, lossPoints: 0 },
  },
  {
    id: "basketball",
    label: "Basketball",
    category: "Team Sport",
    participantLabel: "Teams",
    scoringMode: "points",
    defaultFormat: "round_robin",
    formats: ["round_robin", "single_elimination", "groups_knockout"],
    defaultBestOf: 1,
    rules: { unit: "point", winPoints: 2, drawPoints: 0, lossPoints: 1 },
  },
  {
    id: "cricket",
    label: "Cricket",
    category: "Team Sport",
    participantLabel: "Teams",
    scoringMode: "runs",
    defaultFormat: "round_robin",
    formats: ["round_robin", "single_elimination", "groups_knockout"],
    defaultBestOf: 1,
    rules: { unit: "run", winPoints: 2, drawPoints: 1, lossPoints: 0 },
  },
  {
    id: "tennis",
    label: "Tennis",
    category: "Racquet Sport",
    participantLabel: "Players / pairs",
    scoringMode: "sets",
    defaultFormat: "single_elimination",
    formats: ["single_elimination", "round_robin", "groups_knockout"],
    defaultBestOf: 3,
    rules: { unit: "set", bestOf: 3, gamesPerSet: 6 },
  },
  {
    id: "badminton",
    label: "Badminton",
    category: "Racquet Sport",
    participantLabel: "Players / pairs",
    scoringMode: "points",
    defaultFormat: "single_elimination",
    formats: ["single_elimination", "round_robin", "groups_knockout"],
    defaultBestOf: 3,
    rules: { unit: "game", pointsToWin: 21, bestOf: 3 },
  },
  {
    id: "table-tennis",
    label: "Table Tennis",
    category: "Racquet Sport",
    participantLabel: "Players / pairs",
    scoringMode: "games",
    defaultFormat: "single_elimination",
    formats: ["single_elimination", "round_robin", "groups_knockout"],
    defaultBestOf: 5,
    rules: { unit: "game", pointsToWin: 11, bestOf: 5 },
  },
  {
    id: "volleyball",
    label: "Volleyball",
    category: "Team Sport",
    participantLabel: "Teams",
    scoringMode: "sets",
    defaultFormat: "round_robin",
    formats: ["round_robin", "single_elimination", "groups_knockout"],
    defaultBestOf: 5,
    rules: { unit: "set", pointsToWin: 25, finalSetPointsToWin: 15, bestOf: 5 },
  },
  {
    id: "esports-custom",
    label: "Other Esport",
    category: "Esports",
    participantLabel: "Players / teams",
    scoringMode: "custom",
    defaultFormat: "single_elimination",
    formats: ["single_elimination", "double_elimination", "round_robin", "groups_knockout", "swiss"],
    defaultBestOf: 3,
    rules: { unit: "custom", bestOf: 3 },
  },
  {
    id: "custom",
    label: "Custom Sport / Event",
    category: "Custom",
    participantLabel: "Competitors",
    scoringMode: "custom",
    defaultFormat: "single_elimination",
    formats: ["single_elimination", "double_elimination", "round_robin", "groups_knockout", "swiss"],
    defaultBestOf: 1,
    rules: { unit: "custom" },
  },
];

export function getCompetitionPreset(id: string) {
  return COMPETITION_PRESETS.find((preset) => preset.id === id) ?? COMPETITION_PRESETS[COMPETITION_PRESETS.length - 1];
}
