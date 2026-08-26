import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  recoverTournamentProgressionTransaction,
} from "@/lib/progression/progression-recovery";

/**
 * POST /api/tournaments/:tournamentId/progression/recover
 *
 * Explicit operator-controlled recovery for competition progression.
 *
 * Recovery only replays deterministic, idempotent progression for matches
 * that are already COMPLETED. It never changes scores or selects winners.
 */
export async function POST(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      tournamentId: string;
    }>;
  },
) {
  const { tournamentId } = await params;

  let actor;

  try {
    actor = (
      await requireTournamentManage(tournamentId)
    ).user;
  } catch {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const tournament = await db.tournament.findUnique({
    where: {
      id: tournamentId,
    },
    select: {
      id: true,
    },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  try {
    const recovery =
      await recoverTournamentProgressionTransaction(
        db,
        tournamentId,
      );

    await writeAuditLog({
      tournamentId,
      actorUserId: actor.id,
      action: "PROGRESSION_RECOVERED",
      entityType: "tournament",
      entityId: tournamentId,
      metadata: recovery,
    });

    return NextResponse.json({
      recovery,
      recoveredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[progression recovery] failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to recover tournament progression",
      },
      { status: 500 },
    );
  }
}