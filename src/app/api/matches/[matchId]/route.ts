import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { advanceBracket } from "@/lib/bracket-progression";
import { createBroadcastForMatch, endBroadcastForMatch } from "@/lib/youtube";

function updatedNeedsBroadcast(match: { status: string; youtubeBroadcastId: string | null }) {
  return match.youtubeBroadcastId == null;
}

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

  try {
    await requireTournamentAccess(existing.tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = { ...parsed.data } as typeof parsed.data & {
    startedAt?: Date;
    endedAt?: Date;
    youtubeBroadcastId?: string;
    youtubeVideoId?: string;
  };

  // Timestamp transitions automatically so callers don't have to remember
  // to set them — a match going LIVE for the first time gets startedAt,
  // one going COMPLETED gets endedAt.
  // Prepare YouTube BEFORE publishing LIVE. This makes Start idempotent and
  // prevents a match from becoming visible as LIVE when no broadcast exists.
  if (parsed.data.status === "LIVE" && updatedNeedsBroadcast(existing)) {
    if (!existing.stationId) return NextResponse.json({ error: "Match must be assigned to a station before going LIVE" }, { status: 409 });
    try {
      const broadcast = await createBroadcastForMatch(matchId);
      data.status = "LIVE";
      data.startedAt = existing.startedAt ?? new Date();
      data.youtubeBroadcastId = broadcast.broadcastId;
      data.youtubeVideoId = broadcast.videoId;
    } catch (error) {
      console.error("[youtube broadcast] failed to create broadcast", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to prepare YouTube Live" }, { status: 503 });
    }
  }

  if (parsed.data.status === "COMPLETED") {
    const finalPlayerOneScore = parsed.data.playerOneScore ?? existing.playerOneScore;
    const finalPlayerTwoScore = parsed.data.playerTwoScore ?? existing.playerTwoScore;
    const suppliedWinnerId = parsed.data.winnerId;
    const inferredWinnerId =
      suppliedWinnerId ??
      (finalPlayerOneScore > finalPlayerTwoScore
        ? existing.playerOneId
        : finalPlayerTwoScore > finalPlayerOneScore
          ? existing.playerTwoId
          : undefined);

    if (suppliedWinnerId && suppliedWinnerId !== existing.playerOneId && suppliedWinnerId !== existing.playerTwoId) {
      return NextResponse.json({ error: "winnerId must belong to one of the two players in this match" }, { status: 400 });
    }

    if (!inferredWinnerId) {
      return NextResponse.json(
        { error: "Cannot complete a tied match without winnerId. Set the final score or explicitly select the winner." },
        { status: 409 }
      );
    }

    data.winnerId = inferredWinnerId;

    try {
      await endBroadcastForMatch(matchId);
    } catch (error) {
      console.error("[youtube broadcast] failed to end broadcast", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to end YouTube broadcast" }, { status: 503 });
    }
    data.endedAt = existing.endedAt ?? new Date();
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
