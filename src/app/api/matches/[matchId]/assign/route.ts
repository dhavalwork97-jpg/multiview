import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";
import { defaultRateLimit } from "@/lib/rate-limit";

const assignSchema = z.object({ stationId: z.string().nullable() });

// POST /api/matches/:matchId/assign
// Assign, move, or unassign a queued match from a tournament station.
// The database partial unique index is the final concurrency guard: a station
// can have at most one QUEUED/LIVE match at a time.
export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  let actor;
  try {
    actor = (await requireTournamentManage(match.tournamentId)).user;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = await defaultRateLimit.limit(`assign:${actor.id}`);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many assignment operations — slow down and try again shortly" }, { status: 429 });
  }

  if (match.status !== "QUEUED") {
    return NextResponse.json({ error: "Only queued matches can be assigned, moved, or unassigned" }, { status: 409 });
  }

  // Null stationId is an explicit unassign operation.
  if (parsed.data.stationId === null) {
    const updated = await db.match.update({ where: { id: matchId }, data: { stationId: null } });
    await publishEvent({ type: "match:assigned", tournamentId: updated.tournamentId, matchId: updated.id, stationId: null });
    await writeAuditLog({
      tournamentId: updated.tournamentId,
      actorUserId: actor.id,
      action: "MATCH_UNASSIGNED",
      entityType: "match",
      entityId: updated.id,
      metadata: { previousStationId: match.stationId },
    });
    return NextResponse.json({ match: updated });
  }

  const station = await db.station.findUnique({ where: { id: parsed.data.stationId } });
  if (!station || station.tournamentId !== match.tournamentId) {
    return NextResponse.json({ error: "Station not found in this tournament" }, { status: 400 });
  }

  if (station.status === "LIVE" || station.status === "ERROR") {
    return NextResponse.json({ error: `${station.label} is not available for a new match while it is ${station.status.toLowerCase()}` }, { status: 409 });
  }

  const conflict = await db.match.findFirst({
    where: {
      stationId: station.id,
      status: { in: ["QUEUED", "LIVE"] },
      id: { not: matchId },
    },
    select: { id: true, status: true },
  });
  if (conflict) {
    return NextResponse.json({ error: `${station.label} already has an active match assigned to it` }, { status: 409 });
  }

  try {
    const updated = await db.match.update({ where: { id: matchId }, data: { stationId: station.id } });
    await publishEvent({ type: "match:assigned", tournamentId: updated.tournamentId, matchId: updated.id, stationId: station.id });
    await writeAuditLog({
      tournamentId: updated.tournamentId,
      actorUserId: actor.id,
      action: "MATCH_ASSIGNED",
      entityType: "match",
      entityId: updated.id,
      metadata: { stationId: station.id, stationLabel: station.label, previousStationId: match.stationId },
    });
    return NextResponse.json({ match: updated });
  } catch (error) {
    // The partial unique index converts concurrent assignment races into a
    // deterministic conflict instead of allowing duplicate station occupancy.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: `${station.label} was assigned to another active match. Refresh and choose another station.` }, { status: 409 });
    }
    throw error;
  }
}
