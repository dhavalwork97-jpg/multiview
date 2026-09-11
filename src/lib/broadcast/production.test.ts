import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATCH_TIMELINE,
  advanceProductionCue,
  createProductionState,
  getNextTimelineCue,
  getTimelineCueIndex,
} from "@/lib/broadcast/production";

describe("manual broadcast production engine", () => {
  it("starts in manual mode without automation running", () => {
    expect(createProductionState()).toEqual({
      mode: "manual",
      running: false,
      elapsedMs: 0,
      cueIndex: -1,
      lastIssuedCueId: null,
    });
  });

  it("resolves timeline position without changing the program", () => {
    expect(getTimelineCueIndex(DEFAULT_MATCH_TIMELINE, 0)).toBe(0);
    expect(getTimelineCueIndex(DEFAULT_MATCH_TIMELINE, 11999)).toBe(1);
    expect(getTimelineCueIndex(DEFAULT_MATCH_TIMELINE, 18500)).toBe(3);
  });

  it("advances cues explicitly for operator-driven execution", () => {
    const first = advanceProductionCue(createProductionState(), DEFAULT_MATCH_TIMELINE);
    expect(first.cueIndex).toBe(0);
    expect(first.elapsedMs).toBe(0);
    expect(getNextTimelineCue(DEFAULT_MATCH_TIMELINE, first.cueIndex)?.id).toBe("intro");
  });
});
