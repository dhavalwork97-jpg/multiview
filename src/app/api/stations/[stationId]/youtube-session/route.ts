import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";
import { endStationBroadcast } from "@/lib/youtube";
import { publishEvent } from "@/lib/events";

// Match completion does not call this endpoint. It ends only the physical
// station's YouTube session when the operator is finished with that station.
export async function DELETE(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId }, select: { tournamentId: true, label: true } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  try {
    await requireTournamentAccess(station.tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveMatch = await db.match.findFirst({
    where: { stationId, status: "LIVE" },
    select: { id: true },
  });
  if (liveMatch) {
    return NextResponse.json(
      { error: `${station.label} is still streaming a LIVE match. Complete the match before ending the station YouTube session.` },
      { status: 409 },
    );
  }

  try {
    const result = await endStationBroadcast(stationId);
    const updated = await db.station.findUnique({ where: { id: stationId }, select: { status: true, lastHeartbeatAt: true } });
    if (updated) {
      await publishEvent({
        type: "station:status",
        tournamentId: station.tournamentId,
        stationId,
        status: updated.status,
        lastHeartbeatAt: updated.lastHeartbeatAt?.toISOString() ?? null,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[youtube station session] failed to end", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to end YouTube station stream" }, { status: 503 });
  }
}
