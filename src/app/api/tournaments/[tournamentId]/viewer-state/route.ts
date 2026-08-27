import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateStandings } from "@/lib/standings-engine";
import type {
  CompetitionViewerState,
  ViewerMatch,
  ViewerParticipant,
} from "@/lib/competition/viewer-state";

function participantLabel(participant: {
  playerId: string | null;
  teamId: string | null;
  displayName: string | null;
  player: { gamertag: string } | null;
  team: { name: string } | null;
}): ViewerParticipant {
  if (participant.teamId) {
    return {
      id: participant.teamId,
      type: "team",
      label:
        participant.team?.name ??
        participant.displayName ??
        participant.teamId,
    };
  }

  if (participant.playerId) {
    return {
      id: participant.playerId,
      type: "player",
      label:
        participant.player?.gamertag ??
        participant.displayName ??
        participant.playerId,
    };
  }

  return {
    id: null,
    type: "display",
    label: participant.displayName ?? "TBD",
  };
}

function toViewerMatch(match: {
  id: string;
  status: string;
  round: string | null;
  updatedAt: Date;
  sides: Array<{
    id: string;
    sideKey: string;
    score: number;
    participants: Array<{
      playerId: string | null;
      teamId: string | null;
      displayName: string | null;
      player: { gamertag: string } | null;
      team: { name: string } | null;
    }>;
  }>;
  station: { id: string; label: string } | null;
}): ViewerMatch {
  return {
    id: match.id,
    status: match.status,
    round: match.round,
    station: match.station,
    updatedAt: match.updatedAt.toISOString(),
    sides: match.sides.map((side) => ({
      id: side.id,
      key: side.sideKey,
      score: side.score,
      participants: side.participants.map(participantLabel),
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      game: true,
      sport: true,
      competitionType: true,
      participantMode: true,
      scoringMode: true,
      status: true,
      publicEnabled: true,
      broadcastState: {
        select: {
          scene: true,
          stationId: true,
          matchId: true,
        },
      },
      matches: {
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
          id: true,
          status: true,
          round: true,
          updatedAt: true,
          winnerSideId: true,
          playerOneScore: true,
          playerTwoScore: true,
          rulesSnapshot: true,
          station: {
            select: { id: true, label: true },
          },
          sides: {
            select: {
              id: true,
              sideKey: true,
              score: true,
              participants: {
                select: {
                  playerId: true,
                  teamId: true,
                  displayName: true,
                  player: { select: { gamertag: true } },
                  team: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tournament || !tournament.publicEnabled) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  const live = tournament.matches
    .filter((match) => match.status === "LIVE")
    .map(toViewerMatch);

  const completed = tournament.matches.filter(
    (match) => match.status === "COMPLETED",
  );

  const upcoming = tournament.matches
    .filter(
    (match) =>
      match.status !== "LIVE" &&
      match.status !== "COMPLETED",
  )
  .slice(0, 12)
  .map(toViewerMatch);

  // The existing standings engine is currently head-to-head. Do not
  // pretend it calculates battle-royale placements correctly.
  const standings =
    tournament.competitionType === "league" ||
    tournament.scoringMode === "points"
      ? calculateStandings(completed)
      : [];

  const state: CompetitionViewerState = {
    version: 1,
    generatedAt: new Date().toISOString(),

    tournament: {
      id: tournament.id,
      name: tournament.name,
      game: tournament.game,
      sport: tournament.sport,
      competitionType: tournament.competitionType,
      participantMode: tournament.participantMode,
      scoringMode: tournament.scoringMode,
      status: tournament.status,
    },

    broadcast: tournament.broadcastState
      ? {
          scene: tournament.broadcastState.scene,
          stationId: tournament.broadcastState.stationId,
          matchId: tournament.broadcastState.matchId,
        }
      : null,

    live: {
      matches: live,
      primaryMatchId:
        tournament.broadcastState?.matchId ??
        live[0]?.id ??
        null,
    },

    standings,

    recentResults: completed.slice(0, 12).map((match) => ({
      ...toViewerMatch(match),
      winnerSideId: match.winnerSideId,
    })),

    upcoming,
  };

  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}