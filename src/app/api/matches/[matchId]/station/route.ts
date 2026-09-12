import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({
  stationId: z.string().min(1).nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, tournamentId: true, status: true, stationId: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  let actor;
  try {
    actor = (await requireTournamentManage(match.tournamentId)).user;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (match.status === "LIVE" || match.status === "COMPLETED") {
    return NextResponse.json({ error: "Live or completed matches cannot be reassigned. Stop the match before changing its station." }, { status: 409 });
  }

  const nextStationId = parsed.data.stationId;
  if (nextStationId === match.stationId) return NextResponse.json({ match, unchanged: true });

  if (nextStationId) {
    const station = await db.station.findFirst({
      where: { id: nextStationId, tournamentId: match.tournamentId },
      select: { id: true, status: true, lastHeartbeatAt: true, youtubeLiveStatus: true },
    });
    if (!station) return NextResponse.json({ error: "Station does not belong to this tournament" }, { status: 404 });

    const stale = station.lastHeartbeatAt
      ? Date.now() - new Date(station.lastHeartbeatAt).getTime() > 90_000
      : false;
    if (station.status === "OFFLINE" || station.status === "ERROR" || stale) {
      return NextResponse.json({ error: "Station is not healthy enough to receive a match", stationId: station.id, stale }, { status: 409 });
    }

    const occupied = await db.match.findFirst({
      where: { id: { not: matchId }, tournamentId: match.tournamentId, stationId: nextStationId, status: { in: ["QUEUED", "LIVE"] } },
      select: { id: true },
    });
    if (occupied) return NextResponse.json({ error: "Station is already assigned to another active match", occupiedMatchId: occupied.id }, { status: 409 });
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const latest = await tx.match.findUnique({ where: { id: matchId }, select: { status: true, stationId: true, tournamentId: true } });
      if (!latest) throw new Error("Match not found");
      if (latest.status === "LIVE" || latest.status === "COMPLETED") throw new Error("Match cannot be reassigned while live or after completion");

      if (nextStationId) {
        const station = await tx.station.findFirst({
          where: { id: nextStationId, tournamentId: latest.tournamentId },
          select: { id: true, status: true, lastHeartbeatAt: true },
        });
        if (!station) throw new Error("Station does not belong to this tournament");
        const stale = station.lastHeartbeatAt
          ? Date.now() - new Date(station.lastHeartbeatAt).getTime() > 90_000
          : false;
        if (station.status === "OFFLINE" || station.status === "ERROR" || stale) throw new Error("Station is not healthy enough to receive a match");

        const conflict = await tx.match.findFirst({
          where: { id: { not: matchId }, tournamentId: latest.tournamentId, stationId: nextStationId, status: { in: ["QUEUED", "LIVE"] } },
          select: { id: true },
        });
        if (conflict) throw new Error("Station is already assigned to another active match");
      }

      return tx.match.update({
        where: { id: matchId },
        data: { stationId: nextStationId },
        select: { id: true, tournamentId: true, status: true, stationId: true, playerOneScore: true, playerTwoScore: true, winnerId: true, winnerSideId: true },
      });
    });

    await writeAuditLog({
      tournamentId: updated.tournamentId,
      actorUserId: actor.id,
      action: nextStationId ? "MATCH_STATION_ASSIGNED" : "MATCH_STATION_UNASSIGNED",
      entityType: "match",
      entityId: updated.id,
      metadata: { previousStationId: match.stationId, stationId: updated.stationId },
    });

    await publishEvent({
      type: "match:updated",
      tournamentId: updated.tournamentId,
      matchId: updated.id,
      status: updated.status,
      playerOneScore: updated.playerOneScore,
      playerTwoScore: updated.playerTwoScore,
      winnerId: updated.winnerId,
      winnerSideId: updated.winnerSideId,
      stationId: updated.stationId,
    });

    return NextResponse.json({ match: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign station" }, { status: 409 });
  }
}
