import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { startRoomEgress, egressClient } from "@/lib/livekit";
import type { Station } from "@prisma/client";

/**
 * Shared by both room_started (fast path — the track may already be
 * published by the time this fires) and track_published (retry path — see
 * the comment on the room_started case for why this is needed at all).
 * Idempotent: the listEgress check means calling this twice for the same
 * room once egress is already running is a safe no-op, not a duplicate
 * start.
 */
export async function tryStartEgressForStation(station: Station, roomName: string) {
  const liveMatch = await db.match.findFirst({
    where: { stationId: station.id, status: { in: ["QUEUED", "LIVE"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!liveMatch) {
    console.log(`[livekit webhook] station=${station.id} — no queued/live match, egress will not start`);
    return;
  }

  // Ask LiveKit itself whether an egress is actually active for this
  // room, rather than trusting our own Recording row — a previous attempt
  // that hit the 429 rate limit (or any other failure) could leave that
  // row saying "RECORDING" from an egress that never really started or
  // has since died, which would make this check skip starting a real one
  // forever. This is also what makes it safe to call this function twice
  // (room_started then track_published) for the same room.
  const activeEgresses = await egressClient.listEgress({ roomName, active: true });
  if (activeEgresses.length > 0) {
    console.log(
      `[livekit webhook] skipping egress start — LiveKit reports ${activeEgresses.length} active egress already for room=${roomName}`
    );
    return;
  }

  try {
    const { egressId, hlsPlaylistKey, mp4Key } = await startRoomEgress(
      roomName,
      liveMatch.id,
      station.id
    );

    console.log(`[livekit webhook] egress started station=${station.id} egressId=${egressId} hls=${hlsPlaylistKey}`);

    await db.$transaction([
      db.match.update({
        where: { id: liveMatch.id },
        data: { status: "LIVE", startedAt: liveMatch.startedAt ?? new Date() },
      }),
      db.recording.upsert({
        where: { matchId: liveMatch.id },
        create: {
          matchId: liveMatch.id,
          egressId,
          status: "RECORDING",
          hlsPlaylistKey,
          mp4S3Key: mp4Key,
        },
        update: { egressId, status: "RECORDING", hlsPlaylistKey, mp4S3Key: mp4Key },
      }),
      db.station.update({
        where: { id: station.id },
        data: { playbackIdHls: hlsPlaylistKey.replace(/\/index\.m3u8$/, "") },
      }),
    ]);

    await publishEvent({
      type: "match:updated",
      tournamentId: liveMatch.tournamentId,
      matchId: liveMatch.id,
      status: "LIVE",
      playerOneScore: liveMatch.playerOneScore,
      playerTwoScore: liveMatch.playerTwoScore,
      winnerId: liveMatch.winnerId,
      stationId: station.id,
    });
  } catch (err) {
    // "No published video track found" here is the expected, benign
    // outcome of the room_started fast-path attempt losing the race with
    // OBS's RTMP handshake — track_published will retry this exact call
    // moments later once the track exists. Anything else (S3 credentials,
    // an unreachable egress service, a real LiveKit error) is a genuine
    // failure and stays loud rather than getting swallowed. Either way,
    // still return 200 to the caller so LiveKit doesn't treat this as a
    // delivery failure and start retrying the whole webhook.
    const benign = err instanceof Error && err.message.includes("No published video track found");
    if (benign) {
      console.log(`[livekit webhook] station=${station.id} — video track not published yet, will retry on track_published`);
    } else {
      console.error(`[livekit webhook] egress failed to start for station=${station.id}:`, err);
    }
  }
}