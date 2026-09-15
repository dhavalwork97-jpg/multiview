import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { startCustomerStationBroadcast, stopCustomerStationBroadcast } from "@/lib/broadcast/youtube-station";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId }, select: { tournamentId: true, label: true } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  let actor;
  try {
    actor = (await requireTournamentManage(station.tournamentId)).user;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

  try {
    const vercelOidcToken = req.headers.get("x-vercel-oidc-token") ?? undefined;
    const result = await startCustomerStationBroadcast(matchId, vercelOidcToken);
    const updated = await db.station.findUnique({ where: { id: stationId }, select: { status: true, lastHeartbeatAt: true } });
    if (updated) {
      await publishEvent({ type: "station:status", tournamentId: station.tournamentId, stationId, status: updated.status, lastHeartbeatAt: updated.lastHeartbeatAt?.toISOString() ?? null });
    }
    await writeAuditLog({ tournamentId: station.tournamentId, actorUserId: actor.id, action: "STATION_STREAM_STARTED", entityType: "station", entityId: stationId, metadata: { label: station.label, matchId } });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[youtube customer station session] failed to start", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start YouTube station stream" }, { status: 502 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId }, select: { tournamentId: true, label: true } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  let actor;
  try {
    actor = (await requireTournamentManage(station.tournamentId)).user;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveMatch = await db.match.findFirst({ where: { stationId, status: "LIVE" }, select: { id: true } });
  if (liveMatch) return NextResponse.json({ error: `${station.label} is still streaming a LIVE match. Complete the match before ending the station YouTube session.` }, { status: 409 });

  try {
    const vercelOidcToken = req.headers.get("x-vercel-oidc-token") ?? undefined;
    const result = await stopCustomerStationBroadcast(stationId, vercelOidcToken);
    const updated = await db.station.findUnique({ where: { id: stationId }, select: { status: true, lastHeartbeatAt: true } });
    if (updated) {
      await publishEvent({ type: "station:status", tournamentId: station.tournamentId, stationId, status: updated.status, lastHeartbeatAt: updated.lastHeartbeatAt?.toISOString() ?? null });
    }
    await writeAuditLog({ tournamentId: station.tournamentId, actorUserId: actor.id, action: "STATION_STREAM_ENDED", entityType: "station", entityId: stationId, metadata: { label: station.label } });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[youtube customer station session] failed to end", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to end YouTube station stream" }, { status: 503 });
  }
}
