import { describe, expect, it } from "vitest";
import { animationForScene, BROADCAST_ANIMATIONS } from "@/lib/broadcast/animations";

describe("broadcast animation presets", () => {
  it("maps production scenes to distinct broadcast motion", () => {
    expect(animationForScene("starting-soon")).toBe("countdown-pulse");
    expect(animationForScene("intro")).toBe("scale-in");
    expect(animationForScene("versus")).toBe("versus-slam");
    expect(animationForScene("winner")).toBe("winner-burst");
    expect(animationForScene("champion")).toBe("winner-burst");
    expect(animationForScene("replay")).toBe("replay-sweep");
  });

  it("keeps every preset production-ready with positive duration", () => {
    for (const preset of Object.values(BROADCAST_ANIMATIONS)) {
      expect(preset.durationMs).toBeGreaterThan(0);
      expect(preset.easing.length).toBeGreaterThan(0);
    }
  });
});
