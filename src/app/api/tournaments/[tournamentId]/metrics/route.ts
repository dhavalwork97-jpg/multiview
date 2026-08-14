import { NextResponse } from "next/server";
import { requireTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentAccess(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const metrics = await db.eventDailyMetric.findMany({ where: { tournamentId }, orderBy: { dayKey: "asc" }, select: { dayKey: true, matchId: true, views: true, watchSeconds: true } });
  const totals = metrics.reduce((a, m) => ({ views: a.views + m.views, watchSeconds: a.watchSeconds + m.watchSeconds }), { views: 0, watchSeconds: 0 });
  return NextResponse.json({ totals, metrics });
}
