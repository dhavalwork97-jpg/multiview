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

  it("ignores live and queued matches", () => {
    const match = {
      id: "live", status: "LIVE", playerOneScore: 5, playerTwoScore: 2, winnerSideId: "a", rulesSnapshot: {},
      sides: [
        { id: "a", sideKey: "A", score: 5, participants: [{ playerId: null, teamId: "t1", displayName: null, player: null, team: { name: "Alpha" } }] },
        { id: "b", sideKey: "B", score: 2, participants: [{ playerId: null, teamId: "t2", displayName: null, player: null, team: { name: "Beta" } }] },
      ],
    };
    expect(calculateStandings([match])).toEqual([]);
  });

  it("supports player identities and stable multi-player side identities", () => {
    const rows = calculateStandings([
      {
        id: "duo", status: "COMPLETED", playerOneScore: 1, playerTwoScore: 0, winnerSideId: "a", rulesSnapshot: {},
        sides: [
          { id: "a", sideKey: "A", score: 1, participants: [
            { playerId: "p1", teamId: null, displayName: null, player: { gamertag: "One" }, team: null },
            { playerId: "p2", teamId: null, displayName: null, player: { gamertag: "Two" }, team: null },
          ] },
          { id: "b", sideKey: "B", score: 0, participants: [{ playerId: "p3", teamId: null, displayName: null, player: { gamertag: "Three" }, team: null }] },
        ],
      },
    ]);

    expect(rows[0]).toMatchObject({ label: "One / Two", participantType: "mixed", wins: 1, points: 3 });
    expect(rows[1]).toMatchObject({ label: "Three", participantType: "player", losses: 1 });
  });
});

describe("battle royale standings", () => {
  it("aggregates placement, kills and bonus points across multi-entrant lobbies", () => {
    const matches = [
      {
        id: "br1", status: "COMPLETED", playerOneScore: 0, playerTwoScore: 0, winnerSideId: null,
        rulesSnapshot: {
          scoringAdapter: "battle_royale",
          placementPoints: { 1: 10, 2: 6, 3: 5 },
          finishPoints: 1,
        },
        sides: [
          { id: "s1", sideKey: "P1", score: 0, participants: [{ playerId: "p1", teamId: null, displayName: null, player: { gamertag: "Alpha" }, team: null }] },
          { id: "s2", sideKey: "P2", score: 0, participants: [{ playerId: "p2", teamId: null, displayName: null, player: { gamertag: "Bravo" }, team: null }] },
          { id: "s3", sideKey: "P3", score: 0, participants: [{ playerId: "p3", teamId: null, displayName: null, player: { gamertag: "Charlie" }, team: null }] },
        ],
        scoreEvents: [
          { sideId: "s1", metric: "placement", value: 1 },
          { sideId: "s1", metric: "kills", value: 3 },
          { sideId: "s2", metric: "placement", value: 2 },
          { sideId: "s2", metric: "kills", value: 1 },
          { sideId: "s3", metric: "placement", value: 3 },
          { sideId: "s3", metric: "points", value: 2 },
        ],
      },
    ];

    const rows = calculateStandings(matches);
    expect(rows.map((row) => [row.label, row.points])).toEqual([
      ["Alpha", 13],
      ["Bravo", 7],
      ["Charlie", 7],
    ]);
    expect(rows[0].kills).toBe(3);
    expect(rows[0].firstPlaceFinishes).toBe(1);
    expect(rows[1].rank).toBe(2);
    expect(rows[2].rank).toBe(3);
  });
});
