import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";

const listQuerySchema = z.object({
  tournamentId: z.string().optional(),
  status: z.enum(["QUEUED", "LIVE", "COMPLETED", "DISPUTED"]).optional(),
});

// GET /api/matches — public. This backs the homepage live grid, so it's
// intentionally unauthenticated and cheap: select only what the grid card
// needs, and default to LIVE so the endpoint is fast under load without a
// status filter. Full-text player/station search is a separate route
// (Phase 2) so this one stays a simple indexed query.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    tournamentId: searchParams.get("tournamentId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tournamentId, status } = parsed.data;

  const matches = await db.match.findMany({
    where: {
      status: status ?? "LIVE",
      ...(tournamentId ? { tournamentId } : {}),
    },
    orderBy: [{ hypeScore: "desc" }, { startedAt: "desc" }],
    select: {
      id: true,
      round: true,
      status: true,
      playerOneScore: true,
      playerTwoScore: true,
      startedAt: true,
      hypeScore: true,
      playerOne: { select: { id: true, gamertag: true, avatarUrl: true, country: true } },
      playerTwo: { select: { id: true, gamertag: true, avatarUrl: true, country: true } },
      youtubeVideoId: true,
      station: {
        select: { id: true, label: true, youtubeVideoId: true, status: true },
      },
      tournament: { select: { id: true, name: true, slug: true, game: true } },
    },
    take: 200,
  });

  return NextResponse.json({ matches });
}

const assignSchema = z.object({
  tournamentId: z.string(),
  bracketId: z.string().optional(),
  stationId: z.string(),
  playerOneId: z.string(),
  playerTwoId: z.string(),
  round: z.string().optional(),
});

// POST /api/matches — organizer/admin only. Creates (or re-assigns) a match
// onto a station. This is the action the "Assign matches to stations"
// dashboard feature calls.
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try { await requireTournamentAccess(parsed.data.tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const match = await db.match.create({
    data: {
      ...parsed.data,
      status: "QUEUED",
    },
  });

  return NextResponse.json({ match }, { status: 201 });
}
