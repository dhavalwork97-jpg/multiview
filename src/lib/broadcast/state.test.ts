import { describe, expect, it } from "vitest";
import { mergeBroadcastPersistentState, readBroadcastPersistentState } from "./state";

describe("broadcast persistent state", () => {
  it("merges nested OBS mapping without dropping existing values", () => {
    const result = mergeBroadcastPersistentState(
      { obsMapping: { gameplay: "Game", intro: "Intro" }, sponsorIntervalMs: 6000 },
      { obsMapping: { gameplay: "Main Gameplay" } },
    );
    expect(result.obsMapping).toEqual({ gameplay: "Main Gameplay", intro: "Intro" });
    expect(result.sponsorIntervalMs).toBe(6000);
  });

  it("rejects invalid stored overlay values", () => {
    expect(readBroadcastPersistentState(null)).toEqual({});
    expect(readBroadcastPersistentState("invalid")).toEqual({});
  });
});
