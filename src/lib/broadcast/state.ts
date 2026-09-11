import type { ObsSceneMapping } from "./obs";
import type { ReplayBumper, ReplayClip } from "./replay";
import type { BroadcastOverlayConfig } from "./overlay-builder";

export type BroadcastPersistentState = {
  obsMapping?: Partial<ObsSceneMapping>;
  replay?: { clips: ReplayClip[]; bumper: ReplayBumper };
  sponsorIntervalMs?: number;
  previewScene?: string;
  overlayConfig?: BroadcastOverlayConfig;
};

export function readBroadcastPersistentState(value: unknown): BroadcastPersistentState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as BroadcastPersistentState;
}

export function mergeBroadcastPersistentState(current: unknown, patch: BroadcastPersistentState): BroadcastPersistentState {
  const existing = readBroadcastPersistentState(current);
  return {
    ...existing,
    ...patch,
    obsMapping: patch.obsMapping ? { ...(existing.obsMapping ?? {}), ...patch.obsMapping } : existing.obsMapping,
    replay: patch.replay ?? existing.replay,
    overlayConfig: patch.overlayConfig ?? existing.overlayConfig,
  };
}
