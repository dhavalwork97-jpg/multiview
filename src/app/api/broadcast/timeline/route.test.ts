import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user" }),
}));

const publishEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/events", () => ({ publishEvent }));

describe("broadcast timeline", () => {
  it("selects the gameplay cue and publishes its OBS scene", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/broadcast/timeline", {
      method: "POST",
      body: JSON.stringify({ tournamentId: "t1", elapsedMs: 19000, matchId: "m1", stationId: "s1" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.command.scene).toBe("gameplay");
    expect(data.obsScene).toBe("gameplay");
    expect(publishEvent).toHaveBeenCalledWith(expect.objectContaining({ scene: "gameplay", commandType: "SCENE_SET" }));
  });
});
