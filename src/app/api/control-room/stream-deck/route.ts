import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { writeAuditLog } from "@/lib/audit";

/**
 * Stream Deck bridge for deterministic Control Room operations.
 *
 * Authentication is intentionally token based because Stream Deck HTTP actions
 * do not carry the browser's Clerk session. Keep FGC_STREAM_DECK_TOKEN private.
 */
function authorized(req: Request) {
  const configured = process.env.FGC_STREAM_DECK_TOKEN?.trim();
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function stationFor(tournamentId: string, stationId: string) {
  return db.station.findFirst({
    where: { id: stationId, tournamentId },
    select: { id: true, label: true, status: true, lastHeartbeatAt: true, youtubeLiveStatus: true },
  });
}

function isHealthyStation(station: { status: string; lastHeartbeatAt: Date | null; youtubeLiveStatus: string | null }) {
  if (station.status === "OFFLINE" || station.status === "ERROR") return false;
  const stale = station.youtubeLiveStatus === "starting" && !!station.lastHeartbeatAt && Date.now() - station.lastHeartbeatAt.getTime() > 90_000;
  return !stale;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; tournamentId?: string; stationId?: string };
  try {
    body = (await req.json()) as { action?: string; tournamentId?: string; stationId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  const tournamentId = body.tournamentId;
  const stationId = body.stationId;
  if (!tournamentId || !stationId || !["ASSIGN_NEXT", "CLEAR"].includes(action ?? "")) {
    return NextResponse.json({ error: "Expected tournamentId, stationId and action (ASSIGN_NEXT or CLEAR)" }, { status: 400 });
  }

  const station = await stationFor(tournamentId, stationId);
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  if (!isHealthyStation(station)) return NextResponse.json({ error: "Station is not healthy enough for operator control" }, { status: 409 });

  if (action === "CLEAR") {
    const match = await db.match.findFirst({
      where: { tournamentId, stationId, status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      select: { id: true, stationId: true, status: true, playerOneScore: true, playerTwoScore: true, winnerId: true, winnerSideId: true },
    });
    if (!match) return NextResponse.json({ error: "No queued match is assigned to this station" }, { status: 404 });

    const updated = await db.match.update({
      where: { id: match.id },
      data: { stationId: null },
      select: { id: true, tournamentId: true, status: true, stationId: true, playerOneScore: true, playerTwoScore: true, winnerId: true, winnerSideId: true },
    });

    await writeAuditLog({
      tournamentId,
      actorUserId: null,
      action: "STREAM_DECK_MATCH_CLEARED",
      entityType: "match",
      entityId: updated.id,
      metadata: { stationId, stationLabel: station.label, source: "stream-deck" },
    });
    await publishEvent({
      type: "match:updated",
      tournamentId,
      matchId: updated.id,
      status: updated.status,
      playerOneScore: updated.playerOneScore,
      playerTwoScore: updated.playerTwoScore,
      winnerId: updated.winnerId,
      winnerSideId: updated.winnerSideId,
      stationId: null,
    });
    return NextResponse.json({ ok: true, action, station: station.label, matchId: updated.id });
  }

  const next = await db.match.findFirst({
    where: { tournamentId, status: "QUEUED", stationId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, tournamentId: true, status: true, stationId: true, playerOneScore: true, playerTwoScore: true, winnerId: true, winnerSideId: true },
  });
  if (!next) return NextResponse.json({ error: "No unassigned queued match is available" }, { status: 404 });

  const occupied = await db.match.findFirst({
    where: { tournamentId, stationId, status: { in: ["QUEUED", "LIVE"] } },
    select: { id: true },
  });
  if (occupied) return NextResponse.json({ error: "Station already has an active match", occupiedMatchId: occupied.id }, { status: 409 });

  const updated = await db.$transaction(async (tx) => {
    const latest = await tx.match.findUnique({ where: { id: next.id }, select: { status: true, stationId: true } });
    if (!latest || latest.status !== "QUEUED" || latest.stationId) throw new Error("Queued match is no longer available");
    const conflict = await tx.match.findFirst({ where: { tournamentId, stationId, status: { in: ["QUEUED", "LIVE"] } }, select: { id: true } });
    if (conflict) throw new Error("Station already has an active match");
    return tx.match.update({
      where: { id: next.id },
      data: { stationId },
      select: { id: true, tournamentId: true, status: true, stationId: true, playerOneScore: true, playerTwoScore: true, winnerId: true, winnerSideId: true },
    });
  });

  await writeAuditLog({
    tournamentId,
    actorUserId: null,
    action: "STREAM_DECK_MATCH_ASSIGNED",
    entityType: "match",
    entityId: updated.id,
    metadata: { stationId, stationLabel: station.label, source: "stream-deck" },
  });
  await publishEvent({
    type: "match:updated",
    tournamentId,
    matchId: updated.id,
    status: updated.status,
    playerOneScore: updated.playerOneScore,
    playerTwoScore: updated.playerTwoScore,
    winnerId: updated.winnerId,
    winnerSideId: updated.winnerSideId,
    stationId: updated.stationId,
  });

  return NextResponse.json({ ok: true, action, station: station.label, matchId: updated.id });
}
