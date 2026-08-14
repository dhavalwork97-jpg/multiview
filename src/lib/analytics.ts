import { db } from "@/lib/db";

export async function recordMatchView(matchId: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, select: { tournamentId: true, tournament: { select: { organizationId: true } } } });
  if (!match) return false;
  const dayKey = new Date().toISOString().slice(0, 10);
  await db.eventDailyMetric.upsert({
    where: { tournamentId_matchId_dayKey: { tournamentId: match.tournamentId, matchId, dayKey } },
    update: { views: { increment: 1 } },
    create: { tournamentId: match.tournamentId, organizationId: match.tournament.organizationId, matchId, dayKey, views: 1 },
  });
  return true;
}

export async function recordWatchSeconds(matchId: string, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  const match = await db.match.findUnique({ where: { id: matchId }, select: { tournamentId: true, tournament: { select: { organizationId: true } } } });
  if (!match) return false;
  const dayKey = new Date().toISOString().slice(0, 10);
  await db.eventDailyMetric.upsert({
    where: { tournamentId_matchId_dayKey: { tournamentId: match.tournamentId, matchId, dayKey } },
    update: { watchSeconds: { increment: Math.min(300, Math.floor(seconds)) } },
    create: { tournamentId: match.tournamentId, organizationId: match.tournament.organizationId, matchId, dayKey, watchSeconds: Math.min(300, Math.floor(seconds)) },
  });
  return true;
}
