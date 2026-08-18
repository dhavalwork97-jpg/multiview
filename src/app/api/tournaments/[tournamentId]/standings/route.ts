import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentView } from "@/lib/auth";
import { calculateStandings } from "@/lib/standings-engine";

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentView(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, name: true, sport: true, game: true, format: true, competitionRules: true } });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  const matches = await db.match.findMany({
    where: { tournamentId, status: "COMPLETED" },
    select: { id: true, status: true, playerOneScore: true, playerTwoScore: true, winnerSideId: true, rulesSnapshot: true,
      sides: { select: { id: true, sideKey: true, score: true, participants: { select: { playerId: true, teamId: true, role: true, displayName: true, player: { select: { gamertag: true } }, team: { select: { name: true } } } } } } },
    orderBy: { endedAt: "asc" },
  });
  return NextResponse.json({ tournament, standings: calculateStandings(matches), matchesPlayed: matches.length });
}
