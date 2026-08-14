import { NextResponse } from "next/server";
import { requireTournamentView } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentView(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const [metrics, uniqueViewers, byMatch] = await Promise.all([
    db.eventDailyMetric.findMany({ where: { tournamentId }, orderBy: { dayKey: "asc" }, select: { dayKey: true, matchId: true, views: true, watchSeconds: true } }),
    db.viewerSession.findMany({ where: { tournamentId }, distinct: ["sessionHash"], select: { sessionHash: true } }),
    db.eventDailyMetric.findMany({ where: { tournamentId, matchId: { not: null } }, orderBy: { views: "desc" }, take: 100, select: { matchId: true, dayKey: true, views: true, watchSeconds: true } }),
  ]);
  const totals = metrics.reduce((a, m) => ({ views: a.views + m.views, watchSeconds: a.watchSeconds + m.watchSeconds }), { views: 0, watchSeconds: 0 });

  const matchIds = [...new Set(byMatch.map((m) => m.matchId).filter((id): id is string => !!id))];
  const matches = await db.match.findMany({ where: { id: { in: matchIds } }, select: { id: true, round: true, playerOne: { select: { gamertag: true } }, playerTwo: { select: { gamertag: true } }, station: { select: { label: true } } } });
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  const topMatches = byMatch.map((m) => ({ ...m, match: m.matchId ? matchMap.get(m.matchId) ?? null : null }));
  return NextResponse.json({
    totals: { ...totals, uniqueViewers: uniqueViewers.length, watchHours: Math.round((totals.watchSeconds / 3600) * 100) / 100 },
    metrics,
    topMatches,
  });
}
