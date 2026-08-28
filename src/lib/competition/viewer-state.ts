export type ViewerParticipant = {
  id: string | null;
  type: "player" | "team" | "display";
  label: string;
};

export type ViewerSide = {
  id: string;
  key: string;
  score: number;
  participants: ViewerParticipant[];
};

export type ViewerMatch = {
  id: string;
  status: string;
  round: string | null;
  sides: ViewerSide[];
  station: {
    id: string;
    label: string;
  } | null;
  updatedAt: string;
};

export type ViewerResult = ViewerMatch & {
  winnerSideId: string | null;
};

export type ViewerStanding = {
  rank: number;
  key: string;
  label: string;
  participantType: "team" | "player" | "mixed";
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  winRate: number;
};

export type CompetitionViewerState = {
  version: 1;
  generatedAt: string;

  tournament: {
    id: string;
    name: string;
    game: string;
    sport: string;
    competitionType: string;
    participantMode: string;
    scoringMode: string;
    status: string;
  };

  broadcast: {
    scene: string;
    stationId: string | null;
    matchId: string | null;
  } | null;

  live: {
    matches: ViewerMatch[];
    primaryMatchId: string | null;
  };

  standings: ViewerStanding[];

  recentResults: ViewerResult[];

  upcoming: ViewerMatch[];
};