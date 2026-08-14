import { NextResponse } from "next/server";
import { requireTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentAccess(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, name: true, game: true, status: true, startDate: true, endDate: true } });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const [matches, stations, audit, metrics] = await Promise.all([
    db.match.findMany({ where: { tournamentId }, select: { id: true, status: true, round: true, startedAt: true, endedAt: true, playerOneScore: true, playerTwoScore: true } }),
    db.station.findMany({ where: { tournamentId }, select: { id: true, label: true, status: true, lastHeartbeatAt: true, droppedFrames: true, currentBitrateKbps: true } }),
    db.auditLog.count({ where: { tournamentId } }),
    db.eventDailyMetric.aggregate({ where: { tournamentId }, _sum: { views: true, watchSeconds: true } }),
  ]);

  const completed = matches.filter(m => m.status === "COMPLETED");
  const live = matches.filter(m => m.status === "LIVE");
  const queued = matches.filter(m => m.status === "QUEUED");
  const durations = completed.filter(m => m.startedAt && m.endedAt).map(m => (m.endedAt!.getTime() - m.startedAt!.getTime()) / 60000);
  const avgMatchMinutes = durations.length ? Math.round((durations.reduce((a,b) => a+b, 0) / durations.length) * 10) / 10 : 0;
  const stationSummary = stations.map(s => ({ label: s.label, status: s.status, droppedFrames: s.droppedFrames ?? 0, bitrateKbps: s.currentBitrateKbps ?? 0, lastHeartbeatAt: s.lastHeartbeatAt }));

  return NextResponse.json({ tournament, generatedAt: new Date().toISOString(), summary: { totalMatches: matches.length, completed: completed.length, live: live.length, queued: queued.length, avgMatchMinutes, auditEvents: audit, views: metrics._sum.views ?? 0, watchSeconds: metrics._sum.watchSeconds ?? 0 }, stations: stationSummary });
}
