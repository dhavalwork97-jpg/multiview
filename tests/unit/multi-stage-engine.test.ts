import { describe, expect, it } from "vitest";
import { buildMultiStagePlan } from "@/lib/multi-stage-engine";

function entrants(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    gamertag: `Player ${index + 1}`,
    seed: index + 1,
  }));
}

describe("multi-stage tournament planner", () => {
  it("creates one group and four qualifiers for eight or fewer entrants", () => {
    const plan = buildMultiStagePlan(entrants(8));
    expect(plan.groupCount).toBe(2);
    expect(plan.groups.map((group) => group.entrantIds.length)).toEqual([4, 4]);
    expect(plan.qualifiersPerGroup).toBe(2);
    expect(plan.playoffEntrants).toBe(4);
    expect(plan.playoffRounds).toBe(2);
  });

  it("creates four groups with two qualifiers each for a sixteen entrant event", () => {
    const plan = buildMultiStagePlan(entrants(16));
    expect(plan.groupCount).toBe(4);
    expect(plan.groups.map((group) => group.entrantIds.length)).toEqual([4, 4, 4, 4]);
    expect(plan.qualifiersPerGroup).toBe(2);
    expect(plan.playoffEntrants).toBe(8);
    expect(plan.playoffRounds).toBe(3);
  });

  it("keeps seeded entrants distributed by snake order", () => {
    const plan = buildMultiStagePlan(entrants(16));
    expect(plan.groups.map((group) => group.entrantIds)).toEqual([
      ["p1", "p8", "p9", "p16"],
      ["p2", "p7", "p10", "p15"],
      ["p3", "p6", "p11", "p14"],
      ["p4", "p5", "p12", "p13"],
    ]);
  });
});
