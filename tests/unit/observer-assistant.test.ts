import { describe, expect, it } from "vitest";
import { rankObserverRecommendations } from "@/lib/observer-assistant";

describe("observer assistant", () => {
  it("ranks active fights ahead of quiet teams", () => {
    const rows = rankObserverRecommendations({
      matchId: "m1", mode: "FREE", currentTeamKey: null,
      teams: [{ key: "A", label: "Alpha", kills: 2 }, { key: "B", label: "Bravo", kills: 0 }],
      fights: [{ id: "f1", teamKeys: ["A"], intensity: 90, label: "Alpha push" }],
      generatedAt: new Date().toISOString(),
    });
    expect(rows[0]?.teamKey).toBe("A");
    expect(rows[0]?.priority).toBeGreaterThan(0);
  });
  it("returns no recommendation when there is no combat activity", () => {
    expect(rankObserverRecommendations({ matchId: "m1", mode: "FREE", currentTeamKey: null, teams: [{ key: "A", label: "Alpha" }], fights: [], generatedAt: new Date().toISOString() })).toEqual([]);
  });
});
