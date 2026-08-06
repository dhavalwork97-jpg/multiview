import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/stations?tournamentId=... — organizer dashboard: every station's
// current status, current match, and last heartbeat, for the "automatically
// detect active stations" + "stream health monitoring" features.
export async function GET(req: Request) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  }

  const stations = await db.station.findMany({
    where: { tournamentId },
    orderBy: { label: "asc" },
    select: {
      id: true,
      label: true,
      status: true,
      lastHeartbeatAt: true,
      currentBitrateKbps: true,
      droppedFrames: true,
      matches: {
        where: { status: "LIVE" },
        take: 1,
        select: {
          id: true,
          playerOne: { select: { gamertag: true } },
          playerTwo: { select: { gamertag: true } },
        },
      },
    },
  });

  // A station is considered stale (likely crashed encoder) if no heartbeat
  // in 15s — heartbeats are pushed every 5s from the ingest service via
  // Socket.IO, cached in Redis, and flushed to Postgres every few seconds.
  // Flagging staleness here (vs. only relying on a cron) keeps this endpoint
  // accurate even between flush cycles.
  const STALE_THRESHOLD_MS = 15_000;
  const now = Date.now();

  const withHealth = stations.map((s) => ({
    ...s,
    isStale:
      s.status === "LIVE" &&
      (!s.lastHeartbeatAt || now - s.lastHeartbeatAt.getTime() > STALE_THRESHOLD_MS),
  }));

  return NextResponse.json({ stations: withHealth });
}

const createStationSchema = z.object({
  tournamentId: z.string(),
  label: z.string().min(1),
});

// POST /api/stations — organizer registers a new physical station. Returns
// the generated streamKey the encoder box at that setup will authenticate
// with against the ingest service.
export async function POST(req: Request) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const station = await db.station.create({
    data: {
      tournamentId: parsed.data.tournamentId,
      label: parsed.data.label,
      status: "OFFLINE",
    },
  });

  return NextResponse.json({ station }, { status: 201 });
}
