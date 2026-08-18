import { describe, expect, it } from "vitest";
import { resolveOutcome, resolveRules, validateParticipant, validateSides } from "@/lib/match-engine";

describe("generic match engine", () => {
  it("supports one participant per side for fighting games", () => {
    const sides = [
      { key: "A" as const, participants: [{ playerId: "p1" }] },
      { key: "B" as const, participants: [{ playerId: "p2" }] },
    ];
    expect(() => validateSides(sides)).not.toThrow();
    const outcome = resolveOutcome(
      { key: "A", score: 2, events: [] },
      { key: "B", score: 1, events: [] },
      resolveRules("fighting"),
    );
    expect(outcome.winnerSideKey).toBe("A");
  });

  it("supports multiple team participants on a side", () => {
    expect(() => validateSides([
      { key: "A", participants: [{ playerId: "p1" }, { playerId: "p2" }] },
      { key: "B", participants: [{ teamId: "t2" }] },
    ])).not.toThrow();
  });

  it("rejects a participant that points at both a player and a team", () => {
    expect(() => validateParticipant({ playerId: "p1", teamId: "t1" })).toThrow();
  });

  it("uses sport rules for Valorant rounds", () => {
    const rules = resolveRules("valorant");
    const outcome = resolveOutcome(
      { key: "A", score: 13, events: [] },
      { key: "B", score: 11, events: [] },
      rules,
    );
    expect(rules.scoringAdapter).toBe("rounds");
    expect(outcome.winnerSideKey).toBe("A");
  });

  it("supports BGMI weighted scoring without hard-coding a game into Match", () => {
    const rules = resolveRules("bgmi", { weights: { kills: 2, points: 1 } });
    const outcome = resolveOutcome(
      { key: "A", score: 0, events: [
        { sequence: 1, sideKey: "A", metric: "kills", value: 5 },
        { sequence: 2, sideKey: "A", metric: "points", value: 10 },
      ] },
      { key: "B", score: 0, events: [
        { sequence: 1, sideKey: "B", metric: "kills", value: 7 },
        { sequence: 2, sideKey: "B", metric: "points", value: 1 },
      ] },
      rules,
    );
    expect(outcome.scores.A).toBe(20);
    expect(outcome.scores.B).toBe(15);
    expect(outcome.winnerSideKey).toBe("A");
  });
});
