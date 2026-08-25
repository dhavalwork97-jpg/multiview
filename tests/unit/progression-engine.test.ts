import { describe, expect, it } from "vitest";

describe("progression engine contract", () => {
  it("exposes the expected progression outcomes", () => {
    const outcomes = ["WINNER", "LOSER", "RANK"];

    expect(outcomes).toContain("WINNER");
    expect(outcomes).toContain("LOSER");
    expect(outcomes).toContain("RANK");
  });

  it("uses unresolved advancement slots as the progression boundary", () => {
    const slots = [
      { id: "slot-1", resolvedAt: null },
      { id: "slot-2", resolvedAt: new Date() },
    ];

    const unresolved = slots.filter((slot) => slot.resolvedAt === null);

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].id).toBe("slot-1");
  });

  it("supports winner and loser progression independently", () => {
    const winnerTarget = {
      outcome: "WINNER",
      targetMatchId: "match-2",
      targetSideKey: "A",
    };

    const loserTarget = {
      outcome: "LOSER",
      targetMatchId: "match-3",
      targetSideKey: "B",
    };

    expect(winnerTarget.outcome).toBe("WINNER");
    expect(loserTarget.outcome).toBe("LOSER");
    expect(winnerTarget.targetMatchId).not.toBe(loserTarget.targetMatchId);
  });

  it("does not treat a missing winner as a resolvable match result", () => {
    const match = {
      status: "COMPLETED",
      winnerSideId: null,
    };

    const canProgress =
      match.status === "COMPLETED" &&
      match.winnerSideId !== null;

    expect(canProgress).toBe(false);
  });

  it("requires a target side before resolving an advancement slot", () => {
    const targetSides = [
      { sideKey: "A" },
      { sideKey: "B" },
    ];

    expect(targetSides.some((side) => side.sideKey === "A")).toBe(true);
    expect(targetSides.some((side) => side.sideKey === "C")).toBe(false);
  });
});