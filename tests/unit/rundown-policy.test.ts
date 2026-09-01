import { describe, expect, it } from "vitest";
import {
  canDelete,
  canEdit,
  canReorder,
  canTransition,
  isValidMatchReference,
  movedOrder,
} from "@/lib/rundown-policy";

describe("broadcast rundown safety policy", () => {
  it("allows only the supported lifecycle transitions", () => {
    expect(canTransition("PENDING", "TAKE")).toBe(true);
    expect(canTransition("LIVE", "COMPLETE")).toBe(true);
    expect(canTransition("PENDING", "SKIP")).toBe(true);
    expect(canTransition("LIVE", "TAKE")).toBe(false);
    expect(canTransition("COMPLETED", "TAKE")).toBe(false);
    expect(canTransition("SKIPPED", "COMPLETE")).toBe(false);
  });

  it("protects a live cue from unsafe management operations", () => {
    expect(canEdit("LIVE")).toBe(false);
    expect(canDelete("LIVE")).toBe(false);
    expect(canReorder("LIVE")).toBe(false);
    expect(canEdit("PENDING")).toBe(true);
    expect(canDelete("COMPLETED")).toBe(true);
    expect(canReorder("SKIPPED")).toBe(true);
  });

  it("keeps ordering valid through repeated moves and boundary moves", () => {
    let cues = [{ id: "a" }, { id: "b" }, { id: "c" }];
    cues = movedOrder(cues, "b", "MOVE_UP");
    expect(cues.map((cue) => cue.id)).toEqual(["b", "a", "c"]);
    cues = movedOrder(cues, "b", "MOVE_DOWN");
    expect(cues.map((cue) => cue.id)).toEqual(["a", "b", "c"]);
    expect(movedOrder(cues, "a", "MOVE_UP").map((cue) => cue.id)).toEqual(["a", "b", "c"]);
    expect(movedOrder(cues, "c", "MOVE_DOWN").map((cue) => cue.id)).toEqual(["a", "b", "c"]);
  });

  it("enforces match references by cue type", () => {
    expect(isValidMatchReference("MATCH", "match-1")).toBe(true);
    expect(isValidMatchReference("MATCH", null)).toBe(false);
    expect(isValidMatchReference("BREAK", undefined)).toBe(true);
    expect(isValidMatchReference("BREAK", "match-1")).toBe(false);
  });
});
