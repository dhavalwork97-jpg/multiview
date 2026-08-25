import { describe, expect, it, vi } from "vitest";
import { reconcileProgression } from "@/lib/progression-reconciliation";

function createTx(slots: unknown[]) {
  return {
    advancementSlot: {
      findMany: vi.fn().mockResolvedValue(slots),
    },
  };
}

function baseSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    sourceType: "MATCH_RESULT",
    outcome: "WINNER",
    sourceMatchId: "source-match",
    sourceStageId: null,
    sourceRank: null,
    targetMatchId: "target-match",
    targetSideKey: "A",
    sourceLabel: null,
    resolvedAt: null,

    sourceMatch: {
      id: "source-match",
      tournamentId: "tournament-1",
      status: "QUEUED",
      winnerSideId: null,
      sides: [
        {
          id: "source-side-a",
          sideKey: "A",
          participants: [],
        },
        {
          id: "source-side-b",
          sideKey: "B",
          participants: [],
        },
      ],
    },

    sourceStage: null,

    targetMatch: {
      id: "target-match",
      tournamentId: "tournament-1",
      status: "QUEUED",
      sides: [
        {
          id: "target-side-a",
          sideKey: "A",
          participants: [],
        },
        {
          id: "target-side-b",
          sideKey: "B",
          participants: [],
        },
      ],
    },

    ...overrides,
  };
}

describe("progression reconciliation", () => {
  it("reports a valid unresolved MATCH_RESULT slot as healthy", async () => {
    const tx = createTx([
      baseSlot(),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(true);
    expect(result.checkedSlots).toBe(1);
    expect(result.unresolvedSlots).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it("reports missing sourceMatchId", async () => {
    const tx = createTx([
      baseSlot({
        sourceMatchId: null,
        sourceMatch: null,
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "INVALID_SOURCE_CONFIGURATION",
      ),
    ).toBe(true);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "MISSING_SOURCE_MATCH",
      ),
    ).toBe(true);
  });

  it("reports a missing source match", async () => {
    const tx = createTx([
      baseSlot({
        sourceMatch: null,
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "MISSING_SOURCE_MATCH",
      ),
    ).toBe(true);
  });

  it("reports a completed source match without a winner side", async () => {
    const tx = createTx([
      baseSlot({
        sourceMatch: {
          id: "source-match",
          tournamentId: "tournament-1",
          status: "COMPLETED",
          winnerSideId: null,
          sides: [],
        },
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "UNRESOLVED_COMPLETED_SOURCE",
      ),
    ).toBe(true);
  });

  it("reports a stale resolved slot", async () => {
    const tx = createTx([
      baseSlot({
        resolvedAt: new Date("2026-08-25T10:00:00.000Z"),
        sourceMatch: {
          id: "source-match",
          tournamentId: "tournament-1",
          status: "QUEUED",
          winnerSideId: null,
          sides: [],
        },
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(true);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "STALE_RESOLVED_SLOT",
      ),
    ).toBe(true);

    expect(
      result.issues.find(
        (issue) =>
          issue.type === "STALE_RESOLVED_SLOT",
      )?.severity,
    ).toBe("warning");
  });

  it("reports a missing target match", async () => {
    const tx = createTx([
      baseSlot({
        targetMatch: null,
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "MISSING_TARGET_MATCH",
      ),
    ).toBe(true);
  });

  it("reports a target match belonging to another tournament", async () => {
    const tx = createTx([
      baseSlot({
        targetMatch: {
          id: "target-match",
          tournamentId: "other-tournament",
          status: "QUEUED",
          sides: [
            {
              id: "target-side-a",
              sideKey: "A",
              participants: [],
            },
          ],
        },
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "MISSING_TARGET_MATCH",
    );

    expect(issue).toBeDefined();
    expect(issue?.targetMatchId).toBe("target-match");
  });

  it("reports a missing target side", async () => {
    const tx = createTx([
      baseSlot({
        targetSideKey: "C",
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "MISSING_TARGET_SIDE",
    );

    expect(issue).toBeDefined();
    expect(issue?.targetSideKey).toBe("C");
  });

  it("reports duplicate advancement slots targeting the same side", async () => {
    const tx = createTx([
      baseSlot({
        id: "slot-1",
      }),
      baseSlot({
        id: "slot-2",
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "DUPLICATE_TARGET_SLOT",
    );

    expect(issue).toBeDefined();
    expect(issue?.targetMatchId).toBe("target-match");
    expect(issue?.targetSideKey).toBe("A");
    expect(issue?.detail).toContain("slot-1");
    expect(issue?.detail).toContain("slot-2");
  });

  it("reports missing sourceStageId for STAGE_RANK", async () => {
    const tx = createTx([
      baseSlot({
        sourceType: "STAGE_RANK",
        sourceMatchId: null,
        sourceStageId: null,
        sourceRank: 1,
        sourceMatch: null,
        sourceStage: null,
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "INVALID_SOURCE_CONFIGURATION" &&
        entry.detail.includes("sourceStageId"),
    );

    expect(issue).toBeDefined();
  });

  it("reports an invalid STAGE_RANK sourceRank", async () => {
    const tx = createTx([
      baseSlot({
        sourceType: "STAGE_RANK",
        sourceMatchId: null,
        sourceStageId: "stage-1",
        sourceRank: 0,
        sourceMatch: null,
        sourceStage: {
          id: "stage-1",
          tournamentId: "tournament-1",
        },
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "INVALID_SOURCE_CONFIGURATION" &&
        entry.detail.includes("sourceRank"),
    );

    expect(issue).toBeDefined();
  });

  it("reports a missing source stage", async () => {
    const tx = createTx([
      baseSlot({
        sourceType: "STAGE_RANK",
        sourceMatchId: null,
        sourceStageId: "missing-stage",
        sourceRank: 1,
        sourceMatch: null,
        sourceStage: null,
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "MISSING_SOURCE_STAGE",
      ),
    ).toBe(true);
  });

  it("reports a source stage belonging to another tournament", async () => {
    const tx = createTx([
      baseSlot({
        sourceType: "STAGE_RANK",
        sourceMatchId: null,
        sourceStageId: "stage-1",
        sourceRank: 1,
        sourceMatch: null,
        sourceStage: {
          id: "stage-1",
          tournamentId: "other-tournament",
        },
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "MISSING_SOURCE_STAGE",
    );

    expect(issue).toBeDefined();
    expect(issue?.stageId).toBe("stage-1");
  });

  it("reports a source match belonging to another tournament", async () => {
    const tx = createTx([
      baseSlot({
        sourceMatch: {
          id: "source-match",
          tournamentId: "other-tournament",
          status: "QUEUED",
          winnerSideId: null,
          sides: [],
        },
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(false);

    const issue = result.issues.find(
  (entry) =>
    entry.type === "MISSING_SOURCE_MATCH",
    );

    expect(issue).toBeDefined();
  });

  it("reports MANUAL advancement without sourceLabel as a warning", async () => {
    const tx = createTx([
      baseSlot({
        sourceType: "MANUAL",
        sourceMatchId: null,
        sourceStageId: null,
        sourceRank: null,
        sourceMatch: null,
        sourceStage: null,
        sourceLabel: null,
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(true);

    const issue = result.issues.find(
      (entry) =>
        entry.type === "INVALID_SOURCE_CONFIGURATION",
    );

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
  });

  it("allows MANUAL advancement with a sourceLabel", async () => {
    const tx = createTx([
      baseSlot({
        sourceType: "MANUAL",
        sourceMatchId: null,
        sourceStageId: null,
        sourceRank: null,
        sourceMatch: null,
        sourceStage: null,
        sourceLabel: "Winner of regional qualifier",
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("counts unresolved slots independently of issue severity", async () => {
    const tx = createTx([
      baseSlot({
        id: "slot-unresolved",
        resolvedAt: null,
      }),
      baseSlot({
        id: "slot-resolved",
        resolvedAt: new Date("2026-08-25T10:00:00.000Z"),
      }),
    ]);

    const result = await reconcileProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.checkedSlots).toBe(2);
    expect(result.unresolvedSlots).toBe(1);
  });
});
