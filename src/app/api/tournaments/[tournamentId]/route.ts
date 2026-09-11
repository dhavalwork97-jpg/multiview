import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  let user;
  try {
    user = await requireRole(["ADMIN"]);
  } catch (error) {
    const status = error instanceof ForbiddenError ? 403 : 401;
    return NextResponse.json(
      { error: status === 403 ? "Only platform admins can delete tournaments" : "Not signed in" },
      { status },
    );
  }

  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, organizationId: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  try {
    await db.$transaction(async (tx) => {
      // Remove match-owned records first because Match has references to
      // players/stations/stages/brackets that should remain reusable elsewhere.
      await tx.match.deleteMany({ where: { tournamentId } });
      await tx.progressionEvent.deleteMany({ where: { tournamentId } });
      await tx.broadcastCommand.deleteMany({ where: { tournamentId } });
      await tx.broadcastCue.deleteMany({ where: { tournamentId } });
      await tx.broadcastState.deleteMany({ where: { tournamentId } });
      await tx.auditLog.deleteMany({ where: { tournamentId } });
      await tx.tournamentIncident.deleteMany({ where: { tournamentId } });
      await tx.tournamentEntrant.deleteMany({ where: { tournamentId } });
      await tx.tournamentTeam.deleteMany({ where: { tournamentId } });
      await tx.sponsor.deleteMany({ where: { tournamentId } });
      await tx.notification.deleteMany({ where: { tournamentId } });
      await tx.bracket.deleteMany({ where: { tournamentId } });
      await tx.competitionStage.deleteMany({ where: { tournamentId } });
      await tx.station.deleteMany({ where: { tournamentId } });
      await tx.tournament.delete({ where: { id: tournamentId } });
    });
  } catch (error) {
    console.error("[tournaments] admin delete failed", { tournamentId, error });
    return NextResponse.json({ error: "Unable to delete tournament" }, { status: 500 });
  }

  // The audit row must be written after deletion because AuditLog intentionally
  // has no foreign-key relation to tournaments. This keeps the deletion action
  // visible without blocking the destructive transaction.
  await writeAuditLog({
    tournamentId,
    actorUserId: user.id,
    action: "DELETE_TOURNAMENT",
    entityType: "Tournament",
    entityId: tournamentId,
    metadata: { tournamentName: tournament.name, organizationId: tournament.organizationId },
  });

  return NextResponse.json({ ok: true, deletedTournamentId: tournamentId });
}
