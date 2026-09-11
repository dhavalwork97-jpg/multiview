import { describe, expect, it } from "vitest";
import { createReplayState, normalizeReplayBumper, normalizeReplayClip, replayBumperProgress, replayProgress } from "./replay";

describe("replay production", () => {
  it("normalizes replay clips with safe defaults", () => {
    expect(normalizeReplayClip({ title: "  clutch  ", durationMs: 0 }, 2)).toMatchObject({ id: "replay-3", title: "clutch", durationMs: 1000 });
  });

  it("normalizes bumper settings", () => {
    expect(normalizeReplayBumper({ label: "  REPLAY  ", durationMs: 100 })).toEqual({ enabled: true, label: "REPLAY", durationMs: 500 });
  });

  it("tracks clip and bumper progress", () => {
    const clip = normalizeReplayClip({ id: "r1", title: "Replay", durationMs: 10000 });
    const state = createReplayState(clip, { durationMs: 1000 });
    const now = (state.startedAt ?? 0) + 5000;
    expect(replayProgress(state, now)).toBe(0.5);
    expect(replayBumperProgress(state, now)).toBe(1);
  });
});
