import type { BroadcastTheme } from "@/lib/broadcast/themes";

export type BroadcastOverlayKind =
  | "scoreboard"
  | "lower-third"
  | "countdown"
  | "intro"
  | "versus"
  | "winner"
  | "replay"
  | "sponsor"
  | "program";

export type BroadcastOverlayState = {
  tournamentId: string;
  scene: string;
  commandType: string;
  matchId: string | null;
  stationId: string | null;
  overlay: Record<string, unknown> | null;
  updatedAt: string;
};

export type BroadcastOverlayEvent = {
  type: "broadcast:updated";
  tournamentId: string;
  scene: string;
  stationId: string | null;
  matchId: string | null;
  overlay: Record<string, unknown> | null;
  commandType: string;
};

export function createInitialOverlayState(tournamentId: string): BroadcastOverlayState {
  return {
    tournamentId,
    scene: "starting-soon",
    commandType: "PROGRAM_CLEAR",
    matchId: null,
    stationId: null,
    overlay: null,
    updatedAt: new Date(0).toISOString(),
  };
}

export function applyBroadcastOverlayEvent(
  current: BroadcastOverlayState,
  event: BroadcastOverlayEvent,
): BroadcastOverlayState {
  if (event.tournamentId !== current.tournamentId) return current;

  return {
    tournamentId: event.tournamentId,
    scene: event.scene,
    commandType: event.commandType,
    matchId: event.matchId,
    stationId: event.stationId,
    overlay: event.overlay,
    updatedAt: new Date().toISOString(),
  };
}

export function getOverlayThemeVars(theme: BroadcastTheme): Record<string, string> {
  return {
    "--broadcast-accent": theme.accent,
    "--broadcast-accent-alt": theme.accentAlt,
    "--broadcast-surface": theme.surface,
    "--broadcast-text": theme.text,
    "--broadcast-glow": theme.glow,
  };
}

export function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
