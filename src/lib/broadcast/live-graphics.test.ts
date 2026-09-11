import { describe, expect, it } from "vitest";
import { animationForScoreUpdate, normalizeLiveScore, winnerSide } from "@/lib/broadcast/live-graphics";

describe("live broadcast graphics", () => {
  it("normalizes scores and derives the leader", () => {
    const state = normalizeLiveScore({ scoreA: 3, scoreB: 1, round: 2, eventType: "round" });
    expect(state).toMatchObject({ scoreA: 3, scoreB: 1, round: 2, roundLabel: "ROUND 2", leader: "A" });
  });

  it("preserves prior values when an update is partial", () => {
    const previous = normalizeLiveScore({ scoreA: 2, scoreB: 2, round: 3 });
    const next = normalizeLiveScore({ eventType: "goal" }, previous);
    expect(next.scoreA).toBe(2);
    expect(next.scoreB).toBe(2);
    expect(next.round).toBe(3);
    expect(next.lastEvent).toBe("goal");
  });

  it.each([
    ["score", "score-pop"],
    ["round", "round-slam"],
    ["goal", "goal-burst"],
    ["ko", "ko-impact"],
    ["match-point", "match-point"],
  ] as const)("maps %s to its broadcast animation", (eventType, animation) => {
    const previous = normalizeLiveScore({ scoreA: 0, scoreB: 0 });
    const next = normalizeLiveScore({ scoreA: 1, eventType }, previous);
    expect(animationForScoreUpdate(previous, next)).toBe(animation);
  });

  it("returns the winning side or null for a tie", () => {
    expect(winnerSide(normalizeLiveScore({ scoreA: 4, scoreB: 2 }))).toBe("A");
    expect(winnerSide(normalizeLiveScore({ scoreA: 2, scoreB: 4 }))).toBe("B");
    expect(winnerSide(normalizeLiveScore({ scoreA: 2, scoreB: 2 }))).toBeNull();
  });
});
