export type ReplayClip = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  durationMs: number;
  matchId?: string | null;
  stationId?: string | null;
};

export type ReplayState = {
  active: boolean;
  clip: ReplayClip | null;
  startedAt: number | null;
};

export function createReplayState(clip: ReplayClip): ReplayState {
  return { active: true, clip, startedAt: Date.now() };
}

export function clearReplayState(): ReplayState {
  return { active: false, clip: null, startedAt: null };
}

export function replayProgress(state: ReplayState, now = Date.now()): number {
  if (!state.active || !state.clip || state.startedAt === null) return 0;
  return Math.min(1, Math.max(0, (now - state.startedAt) / Math.max(1, state.clip.durationMs)));
}
