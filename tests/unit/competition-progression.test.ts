import { describe, expect, it, vi } from "vitest";
import {
  advanceCompetitionFromMatch,
  resolveStageRankAdvancements,
} from "@/lib/competition-progression";

function createTx(overrides: Record<string, unknown> = {}) {
  const tx = {
    match: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
      create: vi.fn(),
    },
    ...overrides,
  };

  return tx;
}

describe("competition progression", () => {
  it("advances the winner to the configured target side", async () => {
    const winner = {
      id: "winner-side",
      sideKey: "A",
      participants: [
        {
          playerId: "player-1",
          teamId: null,
          role: "PLAYER",
          displayName: "Player One",
        },
      ],
    };

    const loser = {
      id: "loser-side",
      sideKey: "B",
      participants: [
        {
          playerId: "player-2",
          teamId: null,
          role: "PLAYER",
          displayName: "Player Two",
        },
      ],
    };

    const targetSide = {
      id: "target-side",
      sideKey: "A",
    };

    const slot = {
      id: "slot-1",
      sourceType: "MATCH_RESULT",
      outcome: "WINNER",
      targetMatchId: "target-match",
      targetSideKey: "A",
      resolvedAt: null,
    };

    const tx = createTx();

    tx.match.findUnique.mockResolvedValue({
      id: "source-match",
      status: "COMPLETED",
      winnerSideId: winner.id,
      sides: [winner, loser],
      sourceAdvancements: [slot],
    });

    tx.matchSide.findFirst.mockResolvedValue(targetSide);

    tx.advancementSlot.updateMany.mockResolvedValue({
      count: 1,
    });

    tx.matchSide.findMany.mockResolvedValue([
      {
        id: "target-side",
        sideKey: "A",
        participants: [
          {
            playerId: "player-1",
          },
        ],
      },
      {
        id: "target-side-b",
        sideKey: "B",
        participants: [
          {
            playerId: "player-3",
          },
        ],
      },
    ]);

    const result = await advanceCompetitionFromMatch(tx as any, "source-match");

    expect(result).toEqual([
      {
        slotId: "slot-1",
        targetMatchId: "target-match",
        targetSideKey: "A",
      },
    ]);

    expect(tx.matchParticipant.deleteMany).toHaveBeenCalledWith({
      where: {
        sideId: "target-side",
      },
    });

    expect(tx.matchParticipant.createMany).toHaveBeenCalledWith({
      data: [
        {
          sideId: "target-side",
          playerId: "player-1",
          teamId: null,
          role: "PLAYER",
          displayName: "Player One",
        },
      ],
    });

    expect(tx.advancementSlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "slot-1",
          resolvedAt: null,
        },
      }),
    );
  });

  it("advances the loser to the configured target side", async () => {
    const winner = {
      id: "winner-side",
      sideKey: "A",
      participants: [
        {
          playerId: "player-1",
          teamId: null,
          role: "PLAYER",
          displayName: "Player One",
        },
      ],
    };

    const loser = {
      id: "loser-side",
      sideKey: "B",
      participants: [
        {
          playerId: "player-2",
          teamId: null,
          role: "PLAYER",
          displayName: "Player Two",
        },
      ],
    };

    const slot = {
      id: "slot-2",
      sourceType: "MATCH_RESULT",
      outcome: "LOSER",
      targetMatchId: "target-match",
      targetSideKey: "B",
      resolvedAt: null,
    };

    const tx = createTx();

    tx.match.findUnique.mockResolvedValue({
      id: "source-match",
      status: "COMPLETED",
      winnerSideId: winner.id,
      sides: [winner, loser],
      sourceAdvancements: [slot],
    });

    tx.matchSide.findFirst.mockResolvedValue({
      id: "target-side-b",
      sideKey: "B",
    });

    tx.advancementSlot.updateMany.mockResolvedValue({
      count: 1,
    });

    tx.matchSide.findMany.mockResolvedValue([]);

    const result = await advanceCompetitionFromMatch(tx as any, "source-match");

    expect(result).toEqual([
      {
        slotId: "slot-2",
        targetMatchId: "target-match",
        targetSideKey: "B",
      },
    ]);

    expect(tx.matchParticipant.createMany).toHaveBeenCalledWith({
      data: [
        {
          sideId: "target-side-b",
          playerId: "player-2",
          teamId: null,
          role: "PLAYER",
          displayName: "Player Two",
        },
      ],
    });
  });

  it("is idempotent when the advancement slot has already been claimed", async () => {
    const winner = {
      id: "winner-side",
      sideKey: "A",
      participants: [
        {
          playerId: "player-1",
          teamId: null,
          role: "PLAYER",
          displayName: "Player One",
        },
      ],
    };

    const slot = {
      id: "slot-3",
      sourceType: "MATCH_RESULT",
      outcome: "WINNER",
      targetMatchId: "target-match",
      targetSideKey: "A",
      resolvedAt: null,
    };

    const tx = createTx();

    tx.match.findUnique.mockResolvedValue({
      id: "source-match",
      status: "COMPLETED",
      winnerSideId: winner.id,
      sides: [
        winner,
        {
          id: "loser-side",
          sideKey: "B",
          participants: [],
        },
      ],
      sourceAdvancements: [slot],
    });

    tx.matchSide.findFirst.mockResolvedValue({
      id: "target-side",
      sideKey: "A",
    });

    tx.advancementSlot.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    tx.matchSide.findMany.mockResolvedValue([]);

    const first = await advanceCompetitionFromMatch(tx as any, "source-match");
    const second = await advanceCompetitionFromMatch(tx as any, "source-match");

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);

    expect(tx.matchParticipant.createMany).toHaveBeenCalledTimes(1);
  });

  it("does not resolve a slot when the target side does not exist", async () => {
    const slot = {
      id: "slot-4",
      sourceType: "MATCH_RESULT",
      outcome: "WINNER",
      targetMatchId: "missing-target",
      targetSideKey: "A",
      resolvedAt: null,
    };

    const tx = createTx();

    tx.match.findUnique.mockResolvedValue({
      id: "source-match",
      status: "COMPLETED",
      winnerSideId: "winner-side",
      sides: [
        {
          id: "winner-side",
          sideKey: "A",
          participants: [
            {
              playerId: "player-1",
              teamId: null,
              role: "PLAYER",
              displayName: "Player One",
            },
          ],
        },
        {
          id: "loser-side",
          sideKey: "B",
          participants: [],
        },
      ],
      sourceAdvancements: [slot],
    });

    tx.matchSide.findFirst.mockResolvedValue(null);

    const result = await advanceCompetitionFromMatch(tx as any, "source-match");

    expect(result).toEqual([]);

    expect(tx.advancementSlot.updateMany).not.toHaveBeenCalled();
    expect(tx.matchParticipant.deleteMany).not.toHaveBeenCalled();
    expect(tx.matchParticipant.createMany).not.toHaveBeenCalled();
  });

  it("ignores non-completed matches", async () => {
    const tx = createTx();

    tx.match.findUnique.mockResolvedValue({
      id: "source-match",
      status: "QUEUED",
      winnerSideId: null,
      sides: [],
      sourceAdvancements: [],
    });

    const result = await advanceCompetitionFromMatch(tx as any, "source-match");

    expect(result).toEqual([]);
    expect(tx.advancementSlot.updateMany).not.toHaveBeenCalled();
  });

  it("ignores already-resolved source slots returned by Prisma", async () => {
    const tx = createTx();

    tx.match.findUnique.mockResolvedValue({
      id: "source-match",
      status: "COMPLETED",
      winnerSideId: "winner-side",
      sides: [
        {
          id: "winner-side",
          sideKey: "A",
          participants: [
            {
              playerId: "player-1",
              teamId: null,
              role: "PLAYER",
              displayName: "Player One",
            },
          ],
        },
        {
          id: "loser-side",
          sideKey: "B",
          participants: [],
        },
      ],
      sourceAdvancements: [],
    });

    const result = await advanceCompetitionFromMatch(tx as any, "source-match");

    expect(result).toEqual([]);
    expect(tx.matchSide.findFirst).not.toHaveBeenCalled();
    expect(tx.advancementSlot.updateMany).not.toHaveBeenCalled();
  });
});

describe("stage-rank progression", () => {
  it("resolves a rank advancement into the configured target side", async () => {
    const slot = {
      id: "rank-slot-1",
      sourceType: "STAGE_RANK",
      sourceStageId: "stage-1",
      sourceRank: 1,
      targetMatchId: "target-match",
      targetSideKey: "A",
      resolvedAt: null,
    };

    const tx = createTx();

    tx.advancementSlot.findMany.mockResolvedValue([slot]);

    tx.match.findMany.mockResolvedValue([
      {
        id: "stage-match-1",
        status: "COMPLETED",
        playerOneScore: 2,
        playerTwoScore: 0,
        winnerSideId: "side-a",
        rulesSnapshot: {
          winPoints: 3,
          drawPoints: 1,
          lossPoints: 0,
        },
        sides: [
          {
            id: "side-a",
            sideKey: "A",
            participants: [
              {
                playerId: "player-1",
                teamId: null,
                player: {
                  id: "player-1",
                },
                team: null,
              },
            ],
          },
          {
            id: "side-b",
            sideKey: "B",
            participants: [
              {
                playerId: "player-2",
                teamId: null,
                player: {
                  id: "player-2",
                },
                team: null,
              },
            ],
          },
        ],
      },
    ]);

    tx.matchSide.findFirst.mockResolvedValue({
      id: "target-side",
      sideKey: "A",
    });

    tx.advancementSlot.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await resolveStageRankAdvancements(tx as any, "stage-1");

    expect(result).toEqual([
      {
        slotId: "rank-slot-1",
        targetMatchId: "target-match",
        targetSideKey: "A",
      },
    ]);

    expect(tx.matchParticipant.deleteMany).toHaveBeenCalledWith({
      where: {
        sideId: "target-side",
      },
    });

    expect(tx.matchParticipant.create).toHaveBeenCalledWith({
      data: {
        sideId: "target-side",
        playerId: "player-1",
      },
    });
  });

  it("does not resolve a rank slot when the ranking is unavailable", async () => {
    const slot = {
      id: "rank-slot-2",
      sourceType: "STAGE_RANK",
      sourceStageId: "stage-1",
      sourceRank: 5,
      targetMatchId: "target-match",
      targetSideKey: "A",
      resolvedAt: null,
    };

    const tx = createTx();

    tx.advancementSlot.findMany.mockResolvedValue([slot]);
    tx.match.findMany.mockResolvedValue([]);

    const result = await resolveStageRankAdvancements(tx as any, "stage-1");

    expect(result).toEqual([]);
    expect(tx.matchSide.findFirst).not.toHaveBeenCalled();
    expect(tx.advancementSlot.updateMany).not.toHaveBeenCalled();
  });
});