export type BroadcastOverlayKind = "scoreboard" | "lower-third" | "countdown" | "vs" | "winner" | "sponsor" | "intro";

export type BroadcastTeam = {
  name: string;
  shortName?: string;
  logoUrl?: string | null;
  color?: string | null;
  score?: number;
};

export type BroadcastOverlayState = {
  kind: BroadcastOverlayKind;
  game?: string | null;
  tournamentName?: string | null;
  stage?: string | null;
  format?: string | null;
  station?: string | null;
  teamA?: BroadcastTeam | null;
  teamB?: BroadcastTeam | null;
  playerName?: string | null;
  playerSubtitle?: string | null;
  countdownSeconds?: number | null;
  winner?: BroadcastTeam | null;
  sponsorName?: string | null;
  sponsorLogoUrl?: string | null;
  updatedAt?: number;
};

export function emptyBroadcastState(kind: BroadcastOverlayKind): BroadcastOverlayState {
  return { kind, updatedAt: Date.now() };
}
