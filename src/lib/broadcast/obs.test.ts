import { describe, expect, it } from "vitest";
import { DEFAULT_OBS_SCENE_MAPPING, normalizeObsSceneMapping, resolveObsScene } from "@/lib/broadcast/obs";

describe("OBS scene mapping", () => {
  it("keeps safe defaults for missing scenes", () => {
    expect(normalizeObsSceneMapping({ gameplay: "main-game" }).gameplay).toBe("main-game");
    expect(normalizeObsSceneMapping({ gameplay: "main-game" }).intro).toBe(DEFAULT_OBS_SCENE_MAPPING.intro);
  });

  it("resolves custom and default scene targets", () => {
    expect(resolveObsScene("winner", { winner: "WINNER_SCENE" })).toBe("WINNER_SCENE");
    expect(resolveObsScene("champion")).toBe("champion");
  });
});
