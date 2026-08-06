import { describe, it, expect, beforeEach, vi } from "vitest";

const { authState } = vi.hoisted(() => ({ authState: { userId: null as string | null } }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: authState.userId }),
}));

import { POST, DELETE } from "@/app/api/favorites/route";
import { db } from "@/lib/db";
import { resetDb, createUser, createPlayer } from "./setup";

describe("POST /api/favorites", () => {
  beforeEach(async () => {
    authState.userId = null;
    await resetDb();
  });

  it("requires sign-in", async () => {
    const res = await POST(
      new Request("http://test/api/favorites", { method: "POST", body: JSON.stringify({ playerId: "x" }) })
    );
    expect(res.status).toBe(401);
  });

  it("is idempotent — favoriting the same player twice doesn't error or duplicate", async () => {
    const user = await createUser("VIEWER");
    authState.userId = user.clerkId;
    const player = await createPlayer("Daigo");

    const body = JSON.stringify({ playerId: player.id });
    const first = await POST(new Request("http://test/api/favorites", { method: "POST", body }));
    const second = await POST(new Request("http://test/api/favorites", { method: "POST", body }));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const count = await db.favorite.count({ where: { userId: user.id, playerId: player.id } });
    expect(count).toBe(1);
  });

  it("DELETE removes the favorite", async () => {
    const user = await createUser("VIEWER");
    authState.userId = user.clerkId;
    const player = await createPlayer("Tokido");
    await db.favorite.create({ data: { userId: user.id, playerId: player.id } });

    const res = await DELETE(
      new Request("http://test/api/favorites", {
        method: "DELETE",
        body: JSON.stringify({ playerId: player.id }),
      })
    );
    expect(res.status).toBe(200);

    const count = await db.favorite.count({ where: { userId: user.id, playerId: player.id } });
    expect(count).toBe(0);
  });
});
