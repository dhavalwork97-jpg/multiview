import type { BroadcastScene } from "@/lib/broadcast/production";

export type ObsSceneId = string;
export type ObsSceneMapping = Record<BroadcastScene, ObsSceneId>;

export const DEFAULT_OBS_SCENE_MAPPING: ObsSceneMapping = {
  "starting-soon": "starting-soon",
  intro: "intro",
  versus: "versus",
  gameplay: "gameplay",
  timeout: "timeout",
  replay: "replay",
  winner: "winner",
  champion: "champion",
  brb: "brb",
};

export function normalizeObsSceneMapping(value: Partial<ObsSceneMapping> | null | undefined): ObsSceneMapping {
  return { ...DEFAULT_OBS_SCENE_MAPPING, ...(value ?? {}) };
}

export function resolveObsScene(scene: BroadcastScene, mapping: Partial<ObsSceneMapping> = {}): ObsSceneId {
  return mapping[scene] ?? DEFAULT_OBS_SCENE_MAPPING[scene];
}
