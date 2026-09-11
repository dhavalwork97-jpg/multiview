export type BroadcastScene =
  | "starting-soon"
  | "intro"
  | "versus"
  | "gameplay"
  | "timeout"
  | "replay"
  | "winner"
  | "champion"
  | "brb";

export type BroadcastCommandType =
  | "SCENE_SET"
  | "INTRO_PLAY"
  | "COUNTDOWN_START"
  | "REPLAY_PLAY"
  | "WINNER_SHOW"
  | "BRB_SHOW"
  | "PROGRAM_CLEAR";

export type BroadcastCommand = {
  type: BroadcastCommandType;
  scene: BroadcastScene;
  tournamentId: string;
  matchId?: string | null;
  stationId?: string | null;
  overlay?: Record<string, unknown> | null;
  issuedAt: string;
};

export type TimelineCue = {
  id: string;
  atMs: number;
  durationMs?: number;
  command: Omit<BroadcastCommand, "tournamentId" | "issuedAt">;
};

export type BroadcastTimeline = {
  id: string;
  name: string;
  cues: TimelineCue[];
};

export const DEFAULT_MATCH_TIMELINE: BroadcastTimeline = {
  id: "match-standard",
  name: "Standard Match",
  cues: [
    { id: "countdown", atMs: 0, durationMs: 5000, command: { type: "COUNTDOWN_START", scene: "starting-soon", overlay: { seconds: 5 } } },
    { id: "intro", atMs: 5000, durationMs: 7000, command: { type: "INTRO_PLAY", scene: "intro" } },
    { id: "versus", atMs: 12000, durationMs: 6500, command: { type: "SCENE_SET", scene: "versus" } },
    { id: "gameplay", atMs: 18500, command: { type: "SCENE_SET", scene: "gameplay" } },
  ],
};

export function getTimelineCue(timeline: BroadcastTimeline, elapsedMs: number) {
  return [...timeline.cues].reverse().find((cue) => elapsedMs >= cue.atMs) ?? null;
}

export function createBroadcastCommand(
  tournamentId: string,
  command: TimelineCue["command"],
  context?: Pick<BroadcastCommand, "matchId" | "stationId">,
): BroadcastCommand {
  return {
    ...command,
    tournamentId,
    matchId: context?.matchId ?? null,
    stationId: context?.stationId ?? null,
    issuedAt: new Date().toISOString(),
  };
}
