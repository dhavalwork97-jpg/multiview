import { describe, it, expect } from "vitest";
import { HUD_CONFIGS } from "@/server/ai/game-hud-config";

describe("HUD_CONFIGS filled-pixel heuristic", () => {
  const { isFilledPixel } = HUD_CONFIGS["Street Fighter 6"];

  it("recognizes a healthy green bar as filled", () => {
    expect(isFilledPixel(60, 200, 60)).toBe(true);
  });

  it("recognizes a low-health red bar as filled", () => {
    expect(isFilledPixel(210, 40, 40)).toBe(true);
  });

  it("rejects near-black background", () => {
    expect(isFilledPixel(10, 10, 12)).toBe(false);
  });

  it("rejects near-white UI chrome/borders", () => {
    expect(isFilledPixel(250, 250, 250)).toBe(false);
  });

  it("every configured game has a filled-pixel function and two bar crops", () => {
    for (const [game, config] of Object.entries(HUD_CONFIGS)) {
      expect(config.playerOneBar.width, `${game} playerOneBar.width`).toBeGreaterThan(0);
      expect(config.playerTwoBar.width, `${game} playerTwoBar.width`).toBeGreaterThan(0);
      expect(typeof config.isFilledPixel).toBe("function");
    }
  });
});
