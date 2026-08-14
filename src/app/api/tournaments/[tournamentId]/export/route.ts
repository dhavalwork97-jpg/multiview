import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentManage(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, include: { entrants: { include: { player: true } }, teams: { include: { team: true } }, matches: true, brackets: true, stations: true, sponsors: true } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(JSON.stringify(tournament, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${tournament.slug}.json"` } });
}
