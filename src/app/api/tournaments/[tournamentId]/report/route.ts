import { NextResponse } from "next/server";
import { requireTournamentView } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentView(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, name: true, game: true, status: true, startDate: true, endDate: true } });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const [matches, stations, audit, metrics, uniqueViewers] = await Promise.all([
    db.match.findMany({ where: { tournamentId }, select: { id: true, status: true, round: true, startedAt: true, endedAt: true, playerOneScore: true, playerTwoScore: true } }),
    db.station.findMany({ where: { tournamentId }, select: { id: true, label: true, status: true, lastHeartbeatAt: true, droppedFrames: true, currentBitrateKbps: true } }),
    db.auditLog.count({ where: { tournamentId } }),
    db.eventDailyMetric.aggregate({ where: { tournamentId }, _sum: { views: true, watchSeconds: true } }),
    db.viewerSession.findMany({ where: { tournamentId }, distinct: ["sessionHash"], select: { sessionHash: true } }),
  ]);

  const matchMetricRows = await db.eventDailyMetric.findMany({ where: { tournamentId, matchId: { not: null } }, orderBy: { views: "desc" }, take: 10, select: { matchId: true, views: true, watchSeconds: true } });
  const metricMatchIds = matchMetricRows.map((m) => m.matchId).filter((id): id is string => !!id);
  const metricMatches = await db.match.findMany({ where: { id: { in: metricMatchIds } }, select: { id: true, round: true, playerOne: { select: { gamertag: true } }, playerTwo: { select: { gamertag: true } }, station: { select: { label: true } } } });
  const metricMatchMap = new Map(metricMatches.map((m) => [m.id, m]));
  const topMatches = matchMetricRows.map((m) => ({ ...m, match: m.matchId ? metricMatchMap.get(m.matchId) ?? null : null }));

  const completed = matches.filter(m => m.status === "COMPLETED");
  const live = matches.filter(m => m.status === "LIVE");
  const queued = matches.filter(m => m.status === "QUEUED");
  const durations = completed.filter(m => m.startedAt && m.endedAt).map(m => (m.endedAt!.getTime() - m.startedAt!.getTime()) / 60000);
  const avgMatchMinutes = durations.length ? Math.round((durations.reduce((a,b) => a+b, 0) / durations.length) * 10) / 10 : 0;
  const stationSummary = stations.map(s => ({ label: s.label, status: s.status, droppedFrames: s.droppedFrames ?? 0, bitrateKbps: s.currentBitrateKbps ?? 0, lastHeartbeatAt: s.lastHeartbeatAt }));

  return NextResponse.json({ tournament, generatedAt: new Date().toISOString(), topMatches, summary: { totalMatches: matches.length, completed: completed.length, live: live.length, queued: queued.length, avgMatchMinutes, auditEvents: audit, views: metrics._sum.views ?? 0, watchSeconds: metrics._sum.watchSeconds ?? 0, uniqueViewers: uniqueViewers.length, watchHours: Math.round(((metrics._sum.watchSeconds ?? 0) / 3600) * 100) / 100 }, stations: stationSummary });
}
