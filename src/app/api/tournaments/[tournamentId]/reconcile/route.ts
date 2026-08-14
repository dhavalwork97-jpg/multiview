import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";

// Safe DB-only recovery pass. It never calls YouTube. It repairs stale locks,
// impossible local state, and assigns queued unassigned matches to idle
// stations. YouTube sessions remain operator-controlled.
export async function POST(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let actor;
  try { actor = (await requireTournamentManage(tournamentId)).user; } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const cutoff = new Date(Date.now() - 2 * 60_000);
  const stations = await db.station.findMany({ where: { tournamentId }, orderBy: { label: "asc" } });
  const repaired: string[] = [];
  const warnings: string[] = [];
  const autoAssigned: string[] = [];

  for (const station of stations) {
    if (station.youtubeProvisioningAt && station.youtubeProvisioningAt < cutoff) {
      await db.station.update({ where: { id: station.id }, data: { youtubeProvisioningAt: null } });
      repaired.push(`${station.label}: cleared stale YouTube provisioning lock`);
    }
    const liveMatch = await db.match.findFirst({ where: { stationId: station.id, status: "LIVE" }, select: { id: true } });
    if (liveMatch && station.status === "OFFLINE") {
      await db.station.update({ where: { id: station.id }, data: { status: "ERROR", lastHeartbeatAt: new Date() } });
      repaired.push(`${station.label}: marked ERROR because a LIVE match has no live station state`);
      await publishEvent({ type: "station:status", tournamentId, stationId: station.id, status: "ERROR", lastHeartbeatAt: new Date().toISOString() });
    }
    if (station.youtubeLiveStatus === "starting" && station.lastHeartbeatAt && station.lastHeartbeatAt < cutoff) {
      warnings.push(`${station.label}: YouTube session is still marked starting after 2 minutes; verify OBS.`);
    }
  }

  const idleStations = await db.station.findMany({ where: { tournamentId, status: "IDLE" }, orderBy: { label: "asc" } });
  const unassigned = await db.match.findMany({ where: { tournamentId, status: "QUEUED", stationId: null }, orderBy: { createdAt: "asc" }, take: idleStations.length });
  for (let i = 0; i < Math.min(idleStations.length, unassigned.length); i += 1) {
    const match = unassigned[i];
    const station = idleStations[i];
    await db.match.update({ where: { id: match.id }, data: { stationId: station.id } });
    autoAssigned.push(`${match.id} → ${station.label}`);
    await publishEvent({ type: "match:assigned", tournamentId, matchId: match.id, stationId: station.id });
  }

  await writeAuditLog({ tournamentId, actorUserId: actor.id, action: "SYSTEM_RECONCILED", entityType: "tournament", entityId: tournamentId, metadata: { repaired, warnings, autoAssigned } });
  return NextResponse.json({ repaired, warnings, autoAssigned, checkedAt: new Date().toISOString() });
}
