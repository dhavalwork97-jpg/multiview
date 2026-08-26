import { describe, expect, it, vi } from "vitest";
import {
  recoverTournamentProgression,
} from "@/lib/progression/progression-recovery";

function createTx(overrides: Record<string, unknown> = {}) {
  return {
    match: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },

    competitionStage: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },

    matchSide: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },

    matchParticipant: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
    },

    advancementSlot: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },

    progressionEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },

    ...overrides,
  };
}

describe("progression recovery", () => {
  it("returns zero counts when the tournament has no completed matches", async () => {
    const tx = createTx();

    tx.match.findMany.mockResolvedValue([]);

    const result = await recoverTournamentProgression(
      tx as any,
      "tournament-1",
    );

    expect(result).toEqual({
      checkedMatches: 0,
      recoveredMatches: 0,
      advancedSlots: 0,
      stageRankAdvanced: 0,
      stageCompletions: 0,
      bracketCompletions: 0,
    });
  });

  it("replays progression for completed matches", async () => {
    const tx = createTx();

    tx.match.findMany
      .mockResolvedValueOnce([
        { id: "match-1" },
      ]);

    tx.match.findUnique.mockResolvedValue({
      id: "match-1",
      tournamentId: "tournament-1",
      status: "COMPLETED",
      stageId: null,
      bracketId: null,
      winnerSideId: "side-a",
      sides: [
        {
          id: "side-a",
          sideKey: "A",
          participants: [],
        },
        {
          id: "side-b",
          sideKey: "B",
          participants: [],
        },
      ],
      sourceAdvancements: [],
    });

    tx.progressionEvent.findFirst.mockResolvedValue({
      id: "existing-event",
    });

    const result = await recoverTournamentProgression(
      tx as any,
      "tournament-1",
    );

    expect(result.checkedMatches).toBe(1);

    expect(tx.match.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "match-1" },
      }),
    );
  });

  it("is safe to run repeatedly when no unresolved work remains", async () => {
    const tx = createTx();

    tx.match.findMany.mockResolvedValue([
      { id: "match-1" },
    ]);

    tx.match.findUnique.mockResolvedValue({
      id: "match-1",
      tournamentId: "tournament-1",
      status: "COMPLETED",
      stageId: null,
      bracketId: null,
      winnerSideId: "side-a",
      sides: [
        {
          id: "side-a",
          sideKey: "A",
          participants: [],
        },
        {
          id: "side-b",
          sideKey: "B",
          participants: [],
        },
      ],
      sourceAdvancements: [],
    });

    tx.progressionEvent.findFirst.mockResolvedValue({
      id: "existing-event",
    });

    const first = await recoverTournamentProgression(
      tx as any,
      "tournament-1",
    );

    const second = await recoverTournamentProgression(
      tx as any,
      "tournament-1",
    );

    expect(first.advancedSlots).toBe(0);
    expect(second.advancedSlots).toBe(0);
    expect(first.stageRankAdvanced).toBe(0);
    expect(second.stageRankAdvanced).toBe(0);
  });
});