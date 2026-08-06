import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Recommendation priority, simplest-thing-that-works order:
//   1. A favorited player is live right now — the strongest signal we
//      have, and the one the "notifications when favorite player starts
//      a match" feature is built on too.
//   2. High-hypeScore live matches the viewer hasn't already watched this
//      session (checked against WatchHistoryEntry).
// No collaborative filtering, no ML model — those need viewing-pattern
// volume this platform won't have data for until it's actually run a
// few tournaments. This is the honest v1.
export async function GET() {
  const user = await getCurrentUser();

  const favoritePlayerIds = user
    ? (await db.favorite.findMany({ where: { userId: user.id }, select: { playerId: true } })).map(
        (f) => f.playerId
      )
    : [];

  const watchedMatchIds = user
    ? (
        await db.watchHistoryEntry.findMany({
          where: { userId: user.id },
          select: { matchId: true },
        })
      ).map((w) => w.matchId)
    : [];

  const matchSelect = {
    id: true,
    round: true,
    playerOneScore: true,
    playerTwoScore: true,
    hypeScore: true,
    playerOne: { select: { id: true, gamertag: true } },
    playerTwo: { select: { id: true, gamertag: true } },
    station: { select: { label: true } },
    tournament: { select: { name: true, slug: true } },
  } as const;

  const favoriteMatches = favoritePlayerIds.length
    ? await db.match.findMany({
        where: {
          status: "LIVE",
          OR: [{ playerOneId: { in: favoritePlayerIds } }, { playerTwoId: { in: favoritePlayerIds } }],
        },
        select: matchSelect,
        take: 10,
      })
    : [];

  const favoriteMatchIds = new Set(favoriteMatches.map((m) => m.id));

  const trendingMatches = await db.match.findMany({
    where: {
      status: "LIVE",
      id: { notIn: [...favoriteMatchIds, ...watchedMatchIds] },
    },
    orderBy: { hypeScore: "desc" },
    select: matchSelect,
    take: 10,
  });

  return NextResponse.json({
    becauseYouFollow: favoriteMatches,
    trending: trendingMatches,
  });
}
