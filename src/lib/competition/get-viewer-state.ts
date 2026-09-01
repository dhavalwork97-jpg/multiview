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

export async function getCompetitionViewerState(
  tournamentId: string,
): Promise<CompetitionViewerState | null> {
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
      format: true,
      stages: {
        orderBy: { orderIndex: "asc" },
        select: { id: true, name: true, kind: true, orderIndex: true, status: true },
      },
      broadcastState: {
        select: {
          scene: true,
          stationId: true,
          matchId: true,
        },
      },
      matches: {
        orderBy: { updatedAt: "desc" },
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
    return null;
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

  // Standings are now a first-class competition surface. The engine handles
  // both head-to-head results and multi-entrant Battle Royale lobbies.
  const standings = calculateStandings(completed);

  return {
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
      format: tournament.format,
      presentationMode:
        tournament.scoringMode === "battle_royale" || tournament.sport === "bgmi"
          ? "battle_royale"
          : tournament.format === "ROUND_ROBIN" || tournament.competitionType === "league"
            ? "standings"
            : tournament.format === "SWISS"
              ? "swiss"
              : "bracket",
      stages: tournament.stages,
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
}