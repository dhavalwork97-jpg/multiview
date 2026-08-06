import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchRateLimit, clientIp } from "@/lib/rate-limit";

// Single endpoint, three parallel queries — simpler for the client (one
// request, one loading state on the search dropdown) than three separate
// debounced calls, and Postgres handles three small ILIKE queries in
// parallel fine at this scale. Revisit with a real search index
// (Postgres full-text or Algolia/Meilisearch) if result quality or scale
// demands it later.
export async function GET(req: Request) {
  const { success } = await searchRateLimit.limit(clientIp(req));
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ players: [], stations: [], tournaments: [] });
  }

  const [players, stations, tournaments] = await Promise.all([
    db.player.findMany({
      where: { gamertag: { contains: q, mode: "insensitive" } },
      select: { id: true, gamertag: true, avatarUrl: true, country: true },
      take: 10,
    }),
    db.station.findMany({
      where: { label: { contains: q, mode: "insensitive" } },
      select: {
        id: true,
        label: true,
        status: true,
        tournamentId: true,
        tournament: { select: { name: true, slug: true } },
      },
      take: 10,
    }),
    db.tournament.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, game: true, status: true },
      take: 10,
    }),
  ]);

  return NextResponse.json({ players, stations, tournaments });
}
