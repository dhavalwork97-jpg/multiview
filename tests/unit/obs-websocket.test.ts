import { describe, expect, it } from "vitest";
import { buildObsGraphics, mapBroadcastSceneToObsScene } from "@/lib/obs-websocket";

describe("OBS integration helpers", () => {
  it("maps FGC broadcast scenes to configured OBS scenes", () => {
    expect(mapBroadcastSceneToObsScene("MATCH", { MATCH: "PROGRAM BGMI" })).toBe("PROGRAM BGMI");
    expect(mapBroadcastSceneToObsScene("WAITING", {})).toBe("WAITING");
  });

  it("builds deterministic graphics payloads", () => {
    expect(buildObsGraphics({ tournament: "Summer Cup", game: "BGMI", stage: "Final", match: "Alpha vs Beta", sponsor: "ACME", message: "Grand Final" })).toEqual({
      scoreboard: "Summer Cup · BGMI · Final · Alpha vs Beta",
      lowerThird: "Grand Final",
      overlay: "ACME · Grand Final",
    });
  });
});
