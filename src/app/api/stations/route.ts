import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentView, requireTournamentManage } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

// GET /api/stations?tournamentId=... — organizer dashboard: every station's
// current status, current match, and last heartbeat, for the "automatically
// detect active stations" + "stream health monitoring" features.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  try {
    await requireTournamentView(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      playbackIdHls: true,
      youtubeVideoId: true,
      youtubeLiveStatus: true,
      matches: {
        where: { status: { in: ["QUEUED", "LIVE"] } },
        take: 1,
        select: {
          id: true,
          round: true,
          status: true,
          playerOneScore: true,
          playerTwoScore: true,
          startedAt: true,
          playerOne: { select: { id: true, gamertag: true } },
          playerTwo: { select: { id: true, gamertag: true } },
        },
      },
    },
  });

  // Direct OBS -> YouTube RTMP has no app-side encoder heartbeat. Do not
  // query YouTube here; doing so on every dashboard refresh was a major quota
  // drain. Station state is operator-controlled and event-driven.
  const now = Date.now();
  const withHealth = stations.map((s) => {
    const startingTooLong = s.youtubeLiveStatus === "starting" && s.lastHeartbeatAt
      ? now - new Date(s.lastHeartbeatAt).getTime() > 90_000
      : false;
    return { ...s, isStale: startingTooLong };
  });

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
  const body = await req.json();
  const parsed = createStationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let actor;
  try { actor = (await requireTournamentManage(parsed.data.tournamentId)).user; } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const station = await db.station.create({
    data: {
      tournamentId: parsed.data.tournamentId,
      label: parsed.data.label,
      status: "OFFLINE",
    },
  });

  await writeAuditLog({
    tournamentId: station.tournamentId,
    actorUserId: actor.id,
    action: "STATION_CREATED",
    entityType: "station",
    entityId: station.id,
    metadata: { label: station.label },
  });

  return NextResponse.json({ station }, { status: 201 });
}
