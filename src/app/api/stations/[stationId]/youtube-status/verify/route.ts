import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { verifyStationYoutubeStatus } from "@/lib/youtube";

// Explicit operator verification. This performs at most one YouTube read per
// station every 30 seconds and is never used by viewers or background timers.
export async function POST(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId }, select: { tournamentId: true } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  try { await requireTournamentManage(station.tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  try { return NextResponse.json(await verifyStationYoutubeStatus(stationId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube verification failed" }, { status: 503 }); }
}
