import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";
import { reconcileProgression } from "@/lib/progression-reconciliation";

// Safe DB-only recovery pass. It never calls YouTube. It repairs stale locks,
// impossible local state, and assigns queued unassigned matches to genuinely
// idle stations. The database unique index remains the final concurrency guard.
export async function POST(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let actor;
  try { actor = (await requireTournamentManage(tournamentId)).user; } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const cutoff = new Date(Date.now() - 2 * 60_000);
  const stations = await db.station.findMany({ where: { tournamentId }, orderBy: { label: "asc" } });
  const repaired: string[] = [];
  const warnings: string[] = [];
  const autoAssigned: string[] = [];

  const progression = await reconcileProgression(db, tournamentId);

  for (const issue of progression.issues) {
    warnings.push(`[${issue.type}] ${issue.detail}`);
  }

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

  const occupied = await db.match.findMany({
    where: { tournamentId, status: { in: ["QUEUED", "LIVE"] }, stationId: { not: null } },
    select: { stationId: true },
  });
  const occupiedStationIds = new Set(occupied.map((match) => match.stationId).filter((id): id is string => Boolean(id)));
  const idleStations = stations.filter((station) => station.status === "IDLE" && !occupiedStationIds.has(station.id));

  const unassigned = await db.match.findMany({
    where: { tournamentId, status: "QUEUED", stationId: null },
    orderBy: { createdAt: "asc" },
    take: idleStations.length,
  });

  for (let i = 0; i < Math.min(idleStations.length, unassigned.length); i += 1) {
    const match = unassigned[i];
    const station = idleStations[i];
    try {
      await db.match.update({ where: { id: match.id }, data: { stationId: station.id } });
      autoAssigned.push(`${match.id} → ${station.label}`);
      await publishEvent({ type: "match:assigned", tournamentId, matchId: match.id, stationId: station.id });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        warnings.push(`${station.label}: skipped auto-assignment because another active match claimed the station concurrently.`);
        continue;
      }
      throw error;
    }
  }

  await writeAuditLog({ tournamentId, actorUserId: actor.id, action: "SYSTEM_RECONCILED", entityType: "tournament", entityId: tournamentId, metadata: { repaired, warnings, autoAssigned } });
  return NextResponse.json({
    repaired,
    warnings,
    autoAssigned,
    progression,
    checkedAt: new Date().toISOString(),
  });
}
