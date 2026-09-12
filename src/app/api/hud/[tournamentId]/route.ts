import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function jsonValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const url = new URL(request.url);
  const stationId = url.searchParams.get("station")?.trim() || null;
  const requestedMatchId = url.searchParams.get("matchId")?.trim() || null;

  const state = await db.broadcastState.findUnique({
    where: { tournamentId },
    select: { matchId: true, stationId: true, scene: true, overlay: true },
  });

  const matchId = requestedMatchId || state?.matchId || null;
  const match = matchId
    ? await db.match.findFirst({
        where: { id: matchId, tournamentId, ...(stationId ? { stationId } : {}) },
        select: {
          id: true,
          status: true,
          playerOneScore: true,
          playerTwoScore: true,
          winnerId: true,
          stationId: true,
          playerOne: { select: { gamertag: true, avatarUrl: true, country: true } },
          playerTwo: { select: { gamertag: true, avatarUrl: true, country: true } },
          tournament: { select: { name: true, game: true, bestOf: true } },
        },
      })
    : null;

  return NextResponse.json({
    tournamentId,
    scene: state?.scene ?? "OFFLINE",
    stationId: match?.stationId ?? state?.stationId ?? stationId,
    packageId: typeof jsonValue(state?.overlay).hudPackageId === "string" ? jsonValue(state?.overlay).hudPackageId : null,
    match: match
      ? {
          id: match.id,
          status: match.status,
          playerOne: match.playerOne?.gamertag ?? "PLAYER 1",
          playerTwo: match.playerTwo?.gamertag ?? "PLAYER 2",
          playerOneAvatar: match.playerOne?.avatarUrl ?? null,
          playerTwoAvatar: match.playerTwo?.avatarUrl ?? null,
          playerOneCountry: match.playerOne?.country ?? null,
          playerTwoCountry: match.playerTwo?.country ?? null,
          playerOneScore: match.playerOneScore,
          playerTwoScore: match.playerTwoScore,
          winnerId: match.winnerId,
          game: match.tournament.game,
          tournament: match.tournament.name,
          bestOf: match.tournament.bestOf,
        }
      : null,
    updatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
