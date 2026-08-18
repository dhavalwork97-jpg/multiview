import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public — brackets are viewer-facing (clicking a player opens their live
// match). Enrichment strategy: the stored `structure` JSON is the layout
// (round order, slot positions), and we separately pull every Match row
// for this bracket to get current status/score/station, then hand the
// client both. This avoids re-deriving layout from Match rows (lossy,
// since not every slot has a Match yet) while keeping status always fresh
// (never baked into the stored structure).
export async function GET(_req: Request, { params }: { params: Promise<{ bracketId: string }> }) {
  const { bracketId } = await params;

  const bracket = await db.bracket.findUnique({
    where: { id: bracketId },
    include: {
      matches: {
        select: {
          id: true,
          round: true,
          status: true,
          playerOneId: true,
          playerTwoId: true,
          playerOneScore: true,
          playerTwoScore: true,
          winnerId: true,
          stationId: true,
          youtubeVideoId: true,
          winnerSideId: true,
          sides: { include: { participants: { include: { player: { select: { id: true, gamertag: true } }, team: { select: { id: true, name: true } } } } } },
          playerOne: { select: { gamertag: true } },
          playerTwo: { select: { gamertag: true } },
          // Bracket UI plays matches inline (see BracketWatchDock) rather
          // than only linking out to /watch/:matchId, so it needs enough
          // of Station to actually mount a player — not just the label.
          // playbackIdWebrtc doubles as a fallback: if HLS/egress isn't
          // ready yet (or, e.g., LiveKit's egress quota is exhausted —
          // see STREAMING_ARCHITECTURE.md), the dock can still subscribe
          // directly to the WebRTC room, which needs no egress at all.
          station: { select: { id: true, label: true } },
        },
      },
    },
  });

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }

  // playerId -> matchId, but only for matches currently LIVE — this is
  // exactly what the bracket UI needs to decide whether clicking a
  // player's name should jump to a live stream or just show a tooltip.
  const liveMatchByPlayerId: Record<string, string> = {};
  const liveMatchByTeamId: Record<string, string> = {};
  const participantNameById: Record<string, string> = {};
  // playerId -> gamertag, for every player known so far. A slot only gets
  // a real Match row once BOTH its players are decided (see
  // advanceBracket() in src/lib/bracket-progression.ts) — so a slot with
  // exactly one known player (waiting on the other semifinal, say) has a
  // playerOneId/playerTwoId in `structure` but no Match to read a
  // gamertag off of. Without this map the UI has nothing to show but the
  // raw player id.
  const gamertagByPlayerId: Record<string, string> = {};
  for (const m of bracket.matches) {
    if (m.status === "LIVE") {
      if (m.playerOneId) liveMatchByPlayerId[m.playerOneId] = m.id;
      if (m.playerTwoId) liveMatchByPlayerId[m.playerTwoId] = m.id;
    }
    if (m.playerOneId && m.playerOne) gamertagByPlayerId[m.playerOneId] = m.playerOne.gamertag;
    if (m.playerTwoId && m.playerTwo) gamertagByPlayerId[m.playerTwoId] = m.playerTwo.gamertag;
    for (const side of m.sides) {
      for (const participant of side.participants) {
        if (participant.player) {
          participantNameById[`player:${participant.player.id}`] = participant.player.gamertag;
          if (m.status === "LIVE") liveMatchByPlayerId[participant.player.id] = m.id;
        }
        if (participant.team) {
          participantNameById[`team:${participant.team.id}`] = participant.team.name;
          if (m.status === "LIVE") liveMatchByTeamId[participant.team.id] = m.id;
        }
        if (participant.displayName) participantNameById[`participant:${participant.id}`] = participant.displayName;
      }
    }
  }

  return NextResponse.json({
    bracket: {
      id: bracket.id,
      name: bracket.name,
      format: bracket.format,
      structure: bracket.structure,
    },
    matches: bracket.matches,
    liveMatchByPlayerId,
    liveMatchByTeamId,
    gamertagByPlayerId,
    participantNameById,
  });
}
