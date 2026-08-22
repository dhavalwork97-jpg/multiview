import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export type ProgressionIssueType =
  | "MISSING_SOURCE_MATCH"
  | "MISSING_SOURCE_STAGE"
  | "MISSING_TARGET_MATCH"
  | "MISSING_TARGET_SIDE"
  | "UNRESOLVED_COMPLETED_SOURCE"
  | "STALE_RESOLVED_SLOT"
  | "DUPLICATE_TARGET_SLOT"
  | "INVALID_SOURCE_CONFIGURATION";

export type ProgressionIssue = {
  type: ProgressionIssueType;
  severity: "warning" | "error";
  slotId?: string;
  matchId?: string;
  stageId?: string;
  targetMatchId?: string;
  targetSideKey?: string;
  detail: string;
};

export type ProgressionReconciliation = {
  ok: boolean;
  checkedSlots: number;
  unresolvedSlots: number;
  issues: ProgressionIssue[];
};

/**
 * V31.5 progression graph integrity checker.
 *
 * This function is intentionally READ-ONLY.
 *
 * It does not:
 * - move participants
 * - resolve advancement slots
 * - change match state
 * - change station state
 *
 * Reconciliation must first tell us what is broken before a later repair
 * operation is allowed to mutate competition state.
 */
export async function reconcileProgression(
  tx: Tx,
  tournamentId: string,
): Promise<ProgressionReconciliation> {
  const issues: ProgressionIssue[] = [];

  const slots = await tx.advancementSlot.findMany({
    where: {
      targetMatch: {
        tournamentId,
      },
    },
    include: {
      sourceMatch: {
        select: {
          id: true,
          tournamentId: true,
          status: true,
          winnerSideId: true,
          sides: {
            select: {
              id: true,
              sideKey: true,
              participants: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
      sourceStage: {
        select: {
          id: true,
          tournamentId: true,
        },
      },
      targetMatch: {
        select: {
          id: true,
          tournamentId: true,
          status: true,
          sides: {
            select: {
              id: true,
              sideKey: true,
              participants: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const targetKeys = new Map<string, string[]>();

  for (const slot of slots) {
    const targetKey = `${slot.targetMatchId}:${slot.targetSideKey}`;
    const existing = targetKeys.get(targetKey) ?? [];
    existing.push(slot.id);
    targetKeys.set(targetKey, existing);

    if (!slot.targetMatch) {
      issues.push({
        type: "MISSING_TARGET_MATCH",
        severity: "error",
        slotId: slot.id,
        targetMatchId: slot.targetMatchId,
        targetSideKey: slot.targetSideKey,
        detail: "Advancement slot points to a target match that does not exist.",
      });
      continue;
    }

    if (slot.targetMatch.tournamentId !== tournamentId) {
      issues.push({
        type: "MISSING_TARGET_MATCH",
        severity: "error",
        slotId: slot.id,
        targetMatchId: slot.targetMatchId,
        detail: "Target match belongs to a different tournament.",
      });
    }

    const targetSide = slot.targetMatch.sides.find(
      (side) => side.sideKey === slot.targetSideKey,
    );

    if (!targetSide) {
      issues.push({
        type: "MISSING_TARGET_SIDE",
        severity: "error",
        slotId: slot.id,
        targetMatchId: slot.targetMatchId,
        targetSideKey: slot.targetSideKey,
        detail: "Advancement slot points to a sideKey that does not exist on the target match.",
      });
    }

    if (slot.sourceType === "MATCH_RESULT") {
      if (!slot.sourceMatchId) {
        issues.push({
          type: "INVALID_SOURCE_CONFIGURATION",
          severity: "error",
          slotId: slot.id,
          detail: "MATCH_RESULT advancement is missing sourceMatchId.",
        });
      }

      if (!slot.sourceMatch) {
        issues.push({
          type: "MISSING_SOURCE_MATCH",
          severity: "error",
          slotId: slot.id,
          matchId: slot.sourceMatchId ?? undefined,
          detail: "MATCH_RESULT advancement points to a missing source match.",
        });
        continue;
      }

      if (slot.sourceMatch.tournamentId !== tournamentId) {
        issues.push({
          type: "MISSING_SOURCE_MATCH",
          severity: "error",
          slotId: slot.id,
          matchId: slot.sourceMatch.id,
          detail: "Source match belongs to a different tournament.",
        });
      }

      if (
        slot.sourceMatch.status === "COMPLETED" &&
        !slot.sourceMatch.winnerSideId
      ) {
        issues.push({
          type: "UNRESOLVED_COMPLETED_SOURCE",
          severity: "error",
          slotId: slot.id,
          matchId: slot.sourceMatch.id,
          detail: "Source match is COMPLETED but has no winner side.",
        });
      }

      if (
        slot.resolvedAt &&
        slot.sourceMatch.status !== "COMPLETED"
      ) {
        issues.push({
          type: "STALE_RESOLVED_SLOT",
          severity: "warning",
          slotId: slot.id,
          matchId: slot.sourceMatch.id,
          targetMatchId: slot.targetMatchId,
          targetSideKey: slot.targetSideKey,
          detail:
            "Advancement slot is marked resolved although its source match is not COMPLETED.",
        });
      }
    }

    if (slot.sourceType === "STAGE_RANK") {
      if (!slot.sourceStageId) {
        issues.push({
          type: "INVALID_SOURCE_CONFIGURATION",
          severity: "error",
          slotId: slot.id,
          detail: "STAGE_RANK advancement is missing sourceStageId.",
        });
      }

      if (!slot.sourceRank || slot.sourceRank < 1) {
        issues.push({
          type: "INVALID_SOURCE_CONFIGURATION",
          severity: "error",
          slotId: slot.id,
          detail: "STAGE_RANK advancement has an invalid sourceRank.",
        });
      }

      if (!slot.sourceStage) {
        issues.push({
          type: "MISSING_SOURCE_STAGE",
          severity: "error",
          slotId: slot.id,
          stageId: slot.sourceStageId ?? undefined,
          detail: "STAGE_RANK advancement points to a missing source stage.",
        });
      } else if (slot.sourceStage.tournamentId !== tournamentId) {
        issues.push({
          type: "MISSING_SOURCE_STAGE",
          severity: "error",
          slotId: slot.id,
          stageId: slot.sourceStage.id,
          detail: "Source stage belongs to a different tournament.",
        });
      }
    }

    if (slot.sourceType === "MANUAL" && !slot.sourceLabel) {
      issues.push({
        type: "INVALID_SOURCE_CONFIGURATION",
        severity: "warning",
        slotId: slot.id,
        detail: "MANUAL advancement has no sourceLabel.",
      });
    }
  }

  for (const [targetKey, slotIds] of targetKeys) {
    if (slotIds.length <= 1) continue;

    const [targetMatchId, targetSideKey] = targetKey.split(":");

    issues.push({
      type: "DUPLICATE_TARGET_SLOT",
      severity: "error",
      targetMatchId,
      targetSideKey,
      detail:
        `Multiple advancement slots target ${targetMatchId}/${targetSideKey}: ${slotIds.join(", ")}.`,
    });
  }

  const unresolvedSlots = slots.filter(
    (slot) => slot.resolvedAt === null,
  ).length;

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    checkedSlots: slots.length,
    unresolvedSlots,
    issues,
  };
}
