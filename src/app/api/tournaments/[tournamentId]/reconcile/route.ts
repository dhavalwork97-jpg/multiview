import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";

// Safe recovery pass. It never calls YouTube, so it cannot consume quota.
// It repairs stale provisioning locks and impossible local state, while
// leaving an active station session alone for operator review.
export async function POST(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let actor;
  try { actor = await requireTournamentAccess(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const cutoff = new Date(Date.now() - 2 * 60_000);
  const stations = await db.station.findMany({ where: { tournamentId } });
  const repaired: string[] = [];
  const warnings: string[] = [];

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
      warnings.push(`${station.label}: YouTube session is still marked starting after 2 minutes; verify OBS and use Start again only if necessary.`);
    }
  }

  await writeAuditLog({ tournamentId, actorUserId: actor.id, action: "SYSTEM_RECONCILED", entityType: "tournament", entityId: tournamentId, metadata: { repaired, warnings } });
  return NextResponse.json({ repaired, warnings, checkedAt: new Date().toISOString() });
}
