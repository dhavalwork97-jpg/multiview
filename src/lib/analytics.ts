import { createHash } from "node:crypto";
import { db } from "@/lib/db";

function dayKey() { return new Date().toISOString().slice(0, 10); }
function hashSession(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function recordMatchView(matchId: string, sessionId?: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, select: { tournamentId: true, tournament: { select: { organizationId: true } } } });
  if (!match) return false;
  const day = dayKey();
  const metric = db.eventDailyMetric.upsert({
    where: { tournamentId_matchId_dayKey: { tournamentId: match.tournamentId, matchId, dayKey: day } },
    update: { views: { increment: 1 } },
    create: { tournamentId: match.tournamentId, organizationId: match.tournament.organizationId, matchId, dayKey: day, views: 1 },
  });
  if (sessionId) {
    await db.viewerSession.upsert({
      where: { sessionHash_matchId_dayKey: { sessionHash: hashSession(sessionId), matchId, dayKey: day } },
      update: { lastSeenAt: new Date() },
      create: { sessionHash: hashSession(sessionId), tournamentId: match.tournamentId, matchId, dayKey: day },
    });
  }
  await metric;
  return true;
}

export async function recordWatchSeconds(matchId: string, seconds: number, sessionId?: string) {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  const match = await db.match.findUnique({ where: { id: matchId }, select: { tournamentId: true, tournament: { select: { organizationId: true } } } });
  if (!match) return false;
  const day = dayKey();
  await db.eventDailyMetric.upsert({
    where: { tournamentId_matchId_dayKey: { tournamentId: match.tournamentId, matchId, dayKey: day } },
    update: { watchSeconds: { increment: Math.min(300, Math.floor(seconds)) } },
    create: { tournamentId: match.tournamentId, organizationId: match.tournament.organizationId, matchId, dayKey: day, watchSeconds: Math.min(300, Math.floor(seconds)) },
  });
  if (sessionId) {
    await db.viewerSession.upsert({
      where: { sessionHash_matchId_dayKey: { sessionHash: hashSession(sessionId), matchId, dayKey: day } },
      update: { lastSeenAt: new Date() },
      create: { sessionHash: hashSession(sessionId), tournamentId: match.tournamentId, matchId, dayKey: day },
    });
  }
  return true;
}
