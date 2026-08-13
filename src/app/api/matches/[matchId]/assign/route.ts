import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";
import { publishEvent } from "@/lib/events";

const assignSchema = z.object({ stationId: z.string() });

// POST /api/matches/:matchId/assign — the action behind the organizer's
// station-assignment board (drag-a-match-onto-a-station). Deliberately
// separate from the general PATCH route: assignment has its own
// invariant (station must belong to the same tournament, and shouldn't
// already have a different LIVE match on it) that doesn't belong mixed
// into generic score/status updates.
export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  try { await requireTournamentAccess(match.tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const station = await db.station.findUnique({ where: { id: parsed.data.stationId } });
  if (!station || station.tournamentId !== match.tournamentId) {
    return NextResponse.json({ error: "Station not found in this tournament" }, { status: 400 });
  }

  const conflict = await db.match.findFirst({
    where: { stationId: station.id, status: "LIVE", id: { not: matchId } },
  });
  if (conflict) {
    return NextResponse.json(
      { error: `${station.label} already has a live match on it` },
      { status: 409 }
    );
  }

  const updated = await db.match.update({
    where: { id: matchId },
    data: { stationId: station.id },
  });

  await publishEvent({
    type: "match:assigned",
    tournamentId: updated.tournamentId,
    matchId: updated.id,
    stationId: station.id,
  });

  return NextResponse.json({ match: updated });
}
