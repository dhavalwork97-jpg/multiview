import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// "Most exciting matches ranking" is deliberately just an ORDER BY on the
// hypeScore the AI worker already maintains — no separate ranking system
// to keep in sync. Includes recently-completed matches too (not just
// LIVE) so a match that just ended on a comeback doesn't vanish from
// "trending" the instant it's over.
export async function GET() {
  const matches = await db.match.findMany({
    where: {
      OR: [
        { status: "LIVE" },
        { status: "COMPLETED", endedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
      ],
    },
    orderBy: { hypeScore: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      round: true,
      playerOneScore: true,
      playerTwoScore: true,
      hypeScore: true,
      playerOne: { select: { gamertag: true } },
      playerTwo: { select: { gamertag: true } },
      station: { select: { label: true } },
      tournament: { select: { name: true, slug: true } },
      events: { select: { type: true }, orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  return NextResponse.json({ matches });
}
