import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn().mockResolvedValue({ userId: "test-user" }) }));
const publishEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/events", () => ({ publishEvent }));

describe("broadcast replay endpoint", () => {
  it("publishes a replay command", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/broadcast/replay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId: "t1", clip: { id: "r1", title: "Final Round", durationMs: 5000 } }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).clip.id).toBe("r1");
    expect(publishEvent).toHaveBeenCalledWith(expect.objectContaining({ scene: "replay", commandType: "REPLAY_PLAY" }));
  });
});
