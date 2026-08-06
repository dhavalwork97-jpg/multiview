import { db } from "@/lib/db";
import { cdnUrl } from "@/lib/cdn";
import { publishEvent } from "@/lib/events";
import { clipQueue } from "@/lib/queue";
import { HUD_CONFIGS } from "./game-hud-config";
import { readBothHpFractions } from "./hp-bar-reader";
import { readCrowdLoudness } from "./crowd-signal";
import { startHealthServer } from "@/lib/health-server";

startHealthServer("ai-worker");

// Standalone process, deployed like the clip worker (Fly.io, same
// ffmpeg-equipped image family) — see Dockerfile.ai-worker. Polls rather
// than reacts to events: HP-bar/audio sampling is inherently a "check
// the current frame" operation, there's no webhook LiveKit could send
// for "health bar changed."
const POLL_INTERVAL_MS = 5000;
const LOW_HP_THRESHOLD = 0.15;

// Per-match in-memory tracking of "has this player been critically low
// this round" — comebacks are detected by combining a HP dip below
// LOW_HP_THRESHOLD with that same player's score subsequently going up.
// Deliberately in-memory, not persisted: if this worker restarts
// mid-match, worst case is missing one comeback detection for an
// in-progress round, not corrupted state.
const lowHpFlags = new Map<string, { playerOne: boolean; playerTwo: boolean }>();
const lastKnownScores = new Map<string, { p1: number; p2: number }>();

async function scoreMatch(match: {
  id: string;
  tournamentId: string;
  playerOneScore: number;
  playerTwoScore: number;
  tournament: { game: string };
  station: { playbackIdHls: string | null } | null;
  recording: { hlsPlaylistKey: string | null } | null;
}) {
  const hudConfig = HUD_CONFIGS[match.tournament.game];
  const hlsKey = match.station?.playbackIdHls
    ? `${match.station.playbackIdHls}/index.m3u8`
    : match.recording?.hlsPlaylistKey;

  if (!hlsKey) return; // stream not up yet, nothing to sample

  const playlistUrl = cdnUrl(hlsKey);

  // Signal 1: score closeness — always available, no video sampling
  // needed, so it's the one signal every match has even without HUD
  // calibration for its game.
  const scoreDiff = Math.abs(match.playerOneScore - match.playerTwoScore);
  const closenessSignal = Math.max(0, 1 - scoreDiff / 3);

  let hpSignal = 0.5;
  let comebackDetected: "playerOne" | "playerTwo" | null = null;
  let perfectRoundDetected: "playerOne" | "playerTwo" | null = null;

  if (hudConfig) {
    try {
      const { playerOne, playerTwo } = await readBothHpFractions(playlistUrl, hudConfig);

      // "Hype" from HP alone: both bars low = a close, tense exchange.
      hpSignal = 1 - Math.min(playerOne, playerTwo);

      const flags = lowHpFlags.get(match.id) ?? { playerOne: false, playerTwo: false };
      if (playerOne <= LOW_HP_THRESHOLD) flags.playerOne = true;
      if (playerTwo <= LOW_HP_THRESHOLD) flags.playerTwo = true;
      lowHpFlags.set(match.id, flags);

      // Perfect round: opponent's bar is still essentially full while
      // this player's own round win just landed (score just incremented
      // — checked below via lastKnownScores).
      const prevScores = lastKnownScores.get(match.id);
      if (prevScores) {
        if (match.playerOneScore > prevScores.p1 && playerTwo >= 0.97) {
          perfectRoundDetected = "playerOne";
        } else if (match.playerTwoScore > prevScores.p2 && playerOne >= 0.97) {
          perfectRoundDetected = "playerTwo";
        }

        // Comeback: this player was flagged critically-low earlier and
        // has now won a round.
        if (match.playerOneScore > prevScores.p1 && flags.playerOne) {
          comebackDetected = "playerOne";
          flags.playerOne = false; // reset for the next round
        } else if (match.playerTwoScore > prevScores.p2 && flags.playerTwo) {
          comebackDetected = "playerTwo";
          flags.playerTwo = false;
        }
      }
    } catch {
      // Frame grab or crop failed (stream hiccup, bad coordinates for
      // this game) — fall back to the neutral default rather than let
      // one bad sample kill the whole scoring loop.
    }
  }

  const crowdSignal = await readCrowdLoudness(playlistUrl).catch(() => 0.5);

  // Weighted combination — closeness and crowd reaction matter most day
  // to day; HP tension matters when we have calibrated HUD coordinates
  // for the game, less when we're falling back to the neutral default.
  const hypeScore = Math.round(
    (closenessSignal * 0.35 + hpSignal * 0.25 + crowdSignal * 0.4) * 100
  );

  await db.match.update({ where: { id: match.id }, data: { hypeScore } });

  if (comebackDetected || perfectRoundDetected) {
    const type = comebackDetected ? "COMEBACK" : "PERFECT_ROUND";
    const side = comebackDetected ?? perfectRoundDetected!;

    const recording = await db.recording.findUnique({ where: { matchId: match.id } });
    const elapsedSeconds = recording
      ? Math.floor((Date.now() - recording.startedAt.getTime()) / 1000)
      : 0;

    const event = await db.matchEvent.create({
      data: {
        matchId: match.id,
        type,
        timestampSeconds: elapsedSeconds,
        confidence: 0.65, // heuristic, not a calibrated probability — see game-hud-config.ts caveats
        metadata: { side },
      },
    });

    // Auto highlight generation: reuses the exact same clip pipeline a
    // viewer's manual "clip this" click goes through (Phase 3) —
    // createdById stays null, which Clip's schema comment already
    // reserves for "system-generated."
    if (recording?.hlsPlaylistKey) {
      const clip = await db.clip.create({
        data: {
          matchId: match.id,
          createdById: null,
          title: type === "COMEBACK" ? "Comeback!" : "Perfect round!",
          startSeconds: Math.max(0, elapsedSeconds - 20),
          endSeconds: elapsedSeconds + 5,
          status: "QUEUED",
        },
      });
      await clipQueue.add("cut-clip", {
        clipId: clip.id,
        matchId: match.id,
        hlsPlaylistKey: recording.hlsPlaylistKey,
        startSeconds: clip.startSeconds,
        endSeconds: clip.endSeconds,
      });
    }

    await publishEvent({
      type: "match:updated",
      tournamentId: match.tournamentId,
      matchId: match.id,
      status: "LIVE",
      playerOneScore: match.playerOneScore,
      playerTwoScore: match.playerTwoScore,
      winnerId: null,
      stationId: null,
    });

    console.log(`[ai-worker] ${type} detected in match ${match.id} (event ${event.id})`);
  }

  lastKnownScores.set(match.id, { p1: match.playerOneScore, p2: match.playerTwoScore });
}

async function tick() {
  const liveMatches = await db.match.findMany({
    where: { status: "LIVE" },
    select: {
      id: true,
      tournamentId: true,
      playerOneScore: true,
      playerTwoScore: true,
      tournament: { select: { game: true } },
      station: { select: { playbackIdHls: true } },
      recording: { select: { hlsPlaylistKey: true } },
    },
  });

  await Promise.allSettled(liveMatches.map(scoreMatch));
}

console.log("[ai-worker] starting hype-scoring loop");
setInterval(() => {
  tick().catch((err) => console.error("[ai-worker] tick failed:", err));
}, POLL_INTERVAL_MS);
