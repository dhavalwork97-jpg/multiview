import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";
import { getStationYoutubeStatus } from "@/lib/youtube";

// DB-only: safe for frequent viewer requests and consumes zero YouTube quota.
export async function GET(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId }, select: { tournamentId: true } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  try {
    await requireTournamentAccess(station.tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json(await getStationYoutubeStatus(stationId));
  } catch (error) {
    console.error("[youtube status]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to read station status" }, { status: 503 });
  }
}
