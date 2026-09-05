import { describe, expect, it } from "vitest";
import { REACTIONS } from "@/lib/social-types";
import { socialSessionHash } from "@/lib/social";

describe("social primitives", () => {
  it("only exposes the curated reaction set", () => {
    expect(REACTIONS).toEqual(["🔥", "👏", "😱", "⚡", "💜"]);
  });

  it("does not persist a raw client session identifier", () => {
    const raw = "client-session-0123456789";
    expect(socialSessionHash(raw)).not.toContain(raw);
    expect(socialSessionHash(raw)).toHaveLength(64);
  });
});
