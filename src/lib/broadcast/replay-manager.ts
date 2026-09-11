import { normalizeReplayClip, type ReplayClip } from "@/lib/broadcast/replay";

export function normalizeReplayLibrary(value: Partial<ReplayClip>[] | null | undefined): ReplayClip[] {
  return (value ?? []).map((clip, index) => normalizeReplayClip(clip, index));
}

export function getActiveReplay(clips: ReplayClip[], selectedId: string | null): ReplayClip | null {
  if (!selectedId) return null;
  return clips.find((clip) => clip.id === selectedId) ?? null;
}
