import { describe, expect, it } from "vitest";
import {
  createBattleRoyalePreset,
  getAllowedStageFormats,
  validateDynamicCompetition,
} from "@/lib/dynamic-competition";

describe("dynamic competition engine", () => {
  it("keeps bracket formats out of Battle Royale stages", () => {
    expect(getAllowedStageFormats("BATTLE_ROYALE")).toEqual([
      "BATTLE_ROYALE_SESSION",
      "CUSTOM",
    ]);
  });

  it("builds a multi-stage Battle Royale competition", () => {
    const config = validateDynamicCompetition(createBattleRoyalePreset());
    expect(config.stages.map((stage) => stage.name)).toEqual([
      "Qualifiers",
      "Semifinals",
      "Finals",
    ]);
    expect(config.stages[0].session.games).toBe(6);
    expect(config.stages[1].advancement.value).toBe(20);
    expect(config.stages[2].victory).toMatchObject({
      method: "MATCH_POINT",
      threshold: 50,
      requiresWinAfterThreshold: true,
    });
  });

  it("rejects Round Robin and Swiss inside Battle Royale", () => {
    const config = createBattleRoyalePreset();
    config.stages[0].format = "ROUND_ROBIN";
    expect(() => validateDynamicCompetition(config)).toThrow(/cannot use ROUND_ROBIN/);
  });

  it("requires stage-specific session settings", () => {
    const config = createBattleRoyalePreset();
    config.stages[0].session = { mode: "FIXED_GAMES" };
    expect(() => validateDynamicCompetition(config)).toThrow(/requires a game count/);
  });

  it("allows standard competitions to retain bracket formats", () => {
    const config = createBattleRoyalePreset();
    config.family = "STANDARD";
    config.stages[0].format = "SWISS";
    expect(() => validateDynamicCompetition(config)).not.toThrow();
  });
});
