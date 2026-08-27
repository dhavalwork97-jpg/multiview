import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canOperateTournamentRole, requireTournamentView } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;

  let access;
  try {
    access = await requireTournamentView(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    tournament,
    stations,
    queued,
    incidents,
    activity,
    metrics,
    broadcast,
  ] = await Promise.all([
    db.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        game: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    }),

    db.station.findMany({
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
            playerOne: {
              select: { id: true, gamertag: true },
            },
            playerTwo: {
              select: { id: true, gamertag: true },
            },
          },
        },
      },
    }),

    db.match.findMany({
      where: {
        tournamentId,
        status: "QUEUED",
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        round: true,
        status: true,
        stationId: true,
        playerOneScore: true,
        playerTwoScore: true,
        playerOne: {
          select: { id: true, gamertag: true },
        },
        playerTwo: {
          select: { id: true, gamertag: true },
        },
        station: {
          select: { id: true, label: true },
        },
      },
    }),

    db.tournamentIncident.findMany({
      where: {
        tournamentId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    db.auditLog.findMany({
      where: { tournamentId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    }),

    db.eventDailyMetric.aggregate({
      where: { tournamentId },
      _sum: {
        views: true,
        watchSeconds: true,
      },
    }),

    db.broadcastState.findUnique({
      where: { tournamentId },
      select: {
        id: true,
        scene: true,
        stationId: true,
        matchId: true,
        overlay: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  const now = Date.now();

  const enrichedStations = stations.map((station) => ({
    ...station,
    isStale:
      station.status === "LIVE" &&
      station.lastHeartbeatAt
        ? now - station.lastHeartbeatAt.getTime() > 120_000
        : false,
  }));

  const counts = enrichedStations.reduce(
    (acc, station) => {
      if (station.status === "LIVE" && !station.isStale) {
        acc.live++;
      } else if (station.status === "IDLE") {
        acc.ready++;
      } else if (station.status === "ERROR" || station.isStale) {
        acc.alerts++;
      } else {
        acc.offline++;
      }

      return acc;
    },
    {
      live: 0,
      ready: 0,
      offline: 0,
      alerts: 0,
    },
  );

  const views = metrics._sum.views ?? 0;
  const watchSeconds = metrics._sum.watchSeconds ?? 0;

  return NextResponse.json({
    tournament,
    role: access.role,
    canOperate:
      access.isPlatformAdmin ||
      canOperateTournamentRole(access.role),
    stations: enrichedStations,
    queued,
    incidents,
    activity,
    metrics: {
      views,
      watchSeconds,
      watchHours: Math.round((watchSeconds / 3600) * 100) / 100,
    },
    counts,
    broadcast: broadcast ?? {
      scene: "OFFLINE",
      stationId: null,
      matchId: null,
      overlay: null,
      updatedAt: null,
    },
    checkedAt: new Date().toISOString(),
  });
}