import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { roomNameForStation } from "@/lib/livekit";
import { tryStartEgressForStation } from "@/lib/egress-orchestration";
import { getEgressClient } from "@/lib/livekit";
import { writeAuditLog } from "@/lib/audit";
import { defaultRateLimit } from "@/lib/rate-limit";

/**
 * Operator-triggered LiveKit egress reconciliation.
 * Unlike the DB-only reconciliation endpoint, this one intentionally talks
 * to LiveKit and is never run by spectators or background polling.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let actor;
  try { actor = (await requireTournamentManage(tournamentId)).user; }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const limit = await defaultRateLimit.limit(`egress-reconcile:${actor.id}`);
  if (!limit.success) return NextResponse.json({ error: "Too many reconciliation requests — try again shortly" }, { status: 429 });

  const stations = await db.station.findMany({
    where: { tournamentId, status: "LIVE" },
    select: { id: true, label: true, playbackIdHls: true, tournamentId: true },
    orderBy: { label: "asc" },
  });

  const repaired: string[] = [];
  const healthy: string[] = [];
  const errors: string[] = [];
  if (stations.length === 0) {
    return NextResponse.json({ repaired, healthy, errors, checkedAt: new Date().toISOString() });
  }
  const egress = getEgressClient();

  for (const station of stations) {
    try {
      const active = await egress.listEgress({ roomName: roomNameForStation(station.id), active: true });
      if (active.length > 0 && station.playbackIdHls) {
        healthy.push(station.label);
        continue;
      }

      const before = station.playbackIdHls;
      await tryStartEgressForStation(station, roomNameForStation(station.id));
      const refreshed = await db.station.findUnique({ where: { id: station.id }, select: { playbackIdHls: true } });
      if (refreshed?.playbackIdHls && refreshed.playbackIdHls !== before) repaired.push(station.label);
      else if (!active.length) errors.push(`${station.label}: no active egress and no playback source could be started`);
      else healthy.push(station.label);
    } catch (error) {
      errors.push(`${station.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await writeAuditLog({
    tournamentId,
    actorUserId: actor.id,
    action: "EGRESS_RECONCILED",
    entityType: "tournament",
    entityId: tournamentId,
    metadata: { repaired, healthy, errors },
  });

  return NextResponse.json({ repaired, healthy, errors, checkedAt: new Date().toISOString() });
}
