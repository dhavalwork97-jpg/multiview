import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { advanceBracket } from "@/lib/bracket-progression";

const updateSchema = z.object({
  playerOneScore: z.number().int().min(0).optional(),
  playerTwoScore: z.number().int().min(0).optional(),
  status: z.enum(["QUEUED", "LIVE", "COMPLETED", "DISPUTED"]).optional(),
  winnerId: z.string().optional(),
});

// PATCH /api/matches/:matchId — score-keeper / organizer updates. This is
// the single write path for match state, so every consumer (live grid,
// bracket UI, watch page) only has to trust one source of truth. On
// success it publishes to Redis, which the Socket.IO server fans out to
// the tournament room and the match's own room — see src/server/socket.
export async function PATCH(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { matchId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.match.findUnique({ where: { id: matchId } });
  if (!existing) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const data = { ...parsed.data } as typeof parsed.data & {
    startedAt?: Date;
    endedAt?: Date;
  };

  // Timestamp transitions automatically so callers don't have to remember
  // to set them — a match going LIVE for the first time gets startedAt,
  // one going COMPLETED gets endedAt.
  if (parsed.data.status === "LIVE" && !existing.startedAt) {
    data.startedAt = new Date();
  }
  if (parsed.data.status === "COMPLETED" && !existing.endedAt) {
    data.endedAt = new Date();
  }

  const updated = await db.match.update({ where: { id: matchId }, data });

  await publishEvent({
    type: "match:updated",
    tournamentId: updated.tournamentId,
    matchId: updated.id,
    status: updated.status,
    playerOneScore: updated.playerOneScore,
    playerTwoScore: updated.playerTwoScore,
    winnerId: updated.winnerId,
    stationId: updated.stationId,
  });

  // A match going COMPLETED with a winner is the trigger for bracket
  // progression — see src/lib/bracket-progression.ts for why this is the
  // single write path for that (score-keeper/organizer PATCH is already
  // the single write path for match state generally).
  if (updated.status === "COMPLETED" && updated.winnerId && updated.bracketId) {
    const advanced = await db.$transaction((tx) => advanceBracket(tx, updated));
    if (advanced) {
      await publishEvent({
        type: "bracket:advanced",
        tournamentId: updated.tournamentId,
        bracketId: updated.bracketId,
        matchId: advanced.id,
      });
      // The newly-instantiated (or updated) next-round match needs its own
      // match:updated so the live grid and any open bracket view pick up
      // a real match existing in that slot now, not just the structure
      // JSON having changed.
      const nextMatch = await db.match.findUnique({ where: { id: advanced.id } });
      if (nextMatch) {
        await publishEvent({
          type: "match:updated",
          tournamentId: nextMatch.tournamentId,
          matchId: nextMatch.id,
          status: nextMatch.status,
          playerOneScore: nextMatch.playerOneScore,
          playerTwoScore: nextMatch.playerTwoScore,
          winnerId: nextMatch.winnerId,
          stationId: nextMatch.stationId,
        });
      }
    }
  }

  return NextResponse.json({ match: updated });
}
