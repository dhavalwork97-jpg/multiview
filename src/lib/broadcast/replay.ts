export type ReplayClip = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  durationMs: number;
  matchId?: string | null;
  stationId?: string | null;
};

export type ReplayBumper = {
  enabled: boolean;
  label: string;
  durationMs: number;
};

export type ReplayState = {
  active: boolean;
  clip: ReplayClip | null;
  startedAt: number | null;
  bumper: ReplayBumper;
};

export const DEFAULT_REPLAY_BUMPER: ReplayBumper = {
  enabled: true,
  label: "INSTANT REPLAY",
  durationMs: 1200,
};

export function normalizeReplayClip(value: Partial<ReplayClip>, index = 0): ReplayClip {
  return {
    id: value.id?.trim() || `replay-${index + 1}`,
    title: value.title?.trim() || `Replay ${index + 1}`,
    sourceUrl: value.sourceUrl?.trim() || null,
    thumbnailUrl: value.thumbnailUrl?.trim() || null,
    durationMs: Math.max(1000, Math.floor(Number(value.durationMs ?? 10000))),
    matchId: value.matchId?.trim() || null,
    stationId: value.stationId?.trim() || null,
  };
}

export function normalizeReplayBumper(value: Partial<ReplayBumper> | null | undefined): ReplayBumper {
  return {
    enabled: value?.enabled !== false,
    label: value?.label?.trim() || DEFAULT_REPLAY_BUMPER.label,
    durationMs: Math.max(500, Math.floor(Number(value?.durationMs ?? DEFAULT_REPLAY_BUMPER.durationMs))),
  };
}

export function createReplayState(clip: ReplayClip, bumper: Partial<ReplayBumper> = {}): ReplayState {
  return { active: true, clip: normalizeReplayClip(clip), startedAt: Date.now(), bumper: normalizeReplayBumper(bumper) };
}

export function clearReplayState(bumper: Partial<ReplayBumper> = {}): ReplayState {
  return { active: false, clip: null, startedAt: null, bumper: normalizeReplayBumper(bumper) };
}

export function replayProgress(state: ReplayState, now = Date.now()): number {
  if (!state.active || !state.clip || state.startedAt === null) return 0;
  return Math.min(1, Math.max(0, (now - state.startedAt) / Math.max(1, state.clip.durationMs)));
}

export function replayBumperProgress(state: ReplayState, now = Date.now()): number {
  if (!state.active || !state.bumper.enabled || state.startedAt === null) return 1;
  return Math.min(1, Math.max(0, (now - state.startedAt) / Math.max(1, state.bumper.durationMs)));
}
