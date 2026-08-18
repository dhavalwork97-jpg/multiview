import { describe, expect, it } from "vitest";
import { calculateStandings } from "@/lib/standings-engine";

describe("universal standings engine", () => {
  it("ranks teams using rule points and score difference", () => {
    const matches = [
      {
        id: "m1", status: "COMPLETED", playerOneScore: 2, playerTwoScore: 0, winnerSideId: "a1", rulesSnapshot: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
        sides: [
          { id: "a1", sideKey: "A", score: 2, participants: [{ playerId: null, teamId: "t1", displayName: null, player: null, team: { name: "Alpha" } }] },
          { id: "b1", sideKey: "B", score: 0, participants: [{ playerId: null, teamId: "t2", displayName: null, player: null, team: { name: "Beta" } }] },
        ],
      },
      {
        id: "m2", status: "COMPLETED", playerOneScore: 1, playerTwoScore: 1, winnerSideId: null, rulesSnapshot: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
        sides: [
          { id: "a2", sideKey: "A", score: 1, participants: [{ playerId: null, teamId: "t2", displayName: null, player: null, team: { name: "Beta" } }] },
          { id: "b2", sideKey: "B", score: 1, participants: [{ playerId: null, teamId: "t1", displayName: null, player: null, team: { name: "Alpha" } }] },
        ],
      },
    ];
    const rows = calculateStandings(matches);
    expect(rows[0].label).toBe("Alpha");
    expect(rows[0].points).toBe(4);
    expect(rows[0].scoreDiff).toBe(2);
    expect(rows[1].points).toBe(1);
  });
});
