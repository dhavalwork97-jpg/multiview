import { db } from "@/lib/db";
import { roomService, ingressParticipantIdentity } from "@/lib/livekit";
import { publishEvent } from "@/lib/events";

// Real heartbeat monitoring. `lastHeartbeatAt` used to be set exactly once,
// at `room_started`, and never refreshed — every station reads as "stale"
// after STALE_THRESHOLD_MS in src/app/api/stations/route.ts regardless of
// whether it's still actually streaming, which is why that threshold had
// to be stopgapped from 15s to 5min. There's no encoder-box client to push
// a real heartbeat (nothing runs on the PS5 capture rigs beyond OBS/RTMP),
// so this polls LiveKit's own room/participant state instead — the closest
// thing to ground truth available without building and deploying custom
// encoder-side software.
//
// Runs from this process specifically (not a Vercel API route) because
// it's the one persistent, always-on process in the whole stack — a
// setInterval in a serverless function doesn't outlive the request.

const POLL_INTERVAL_MS = 20_000;

export function startHeartbeatPoller() {
  const tick = async () => {
    try {
      await pollLiveStations();
    } catch (err) {
      console.error("[heartbeat] poll failed", err);
    }
  };

  tick();
  return setInterval(tick, POLL_INTERVAL_MS);
}

async function pollLiveStations() {
  const liveStations = await db.station.findMany({
    where: { status: "LIVE" },
    select: { id: true, tournamentId: true, playbackIdWebrtc: true, status: true },
  });

  if (liveStations.length === 0) return;

  await Promise.all(liveStations.map(checkStation));
}

async function checkStation(station: {
  id: string;
  tournamentId: string;
  playbackIdWebrtc: string | null;
}) {
  if (!station.playbackIdWebrtc) return;
  const roomName = station.playbackIdWebrtc;

  let isPublishing = false;
  try {
    const participant = await roomService.getParticipant(
      roomName,
      ingressParticipantIdentity(station.id)
    );
    // A participant can still be joined but not actually sending video
    // (e.g. OBS froze but the TCP connection is technically alive) — only
    // count it healthy if at least one track is actually publishing.
    isPublishing = participant.tracks.some((t) => !t.muted);
  } catch {
    // getParticipant throws (404-equivalent) when the ingress participant
    // isn't in the room at all — encoder disconnected without a clean
    // room_finished webhook (the exact "flappy encoder" case
    // StationAssignmentBoard's force-close-room button exists for).
    isPublishing = false;
  }

  if (isPublishing) {
    const updated = await db.station.update({
      where: { id: station.id },
      data: { lastHeartbeatAt: new Date() },
    });
    await publishEvent({
      type: "station:status",
      tournamentId: station.tournamentId,
      stationId: station.id,
      status: "LIVE",
      lastHeartbeatAt: updated.lastHeartbeatAt?.toISOString() ?? null,
    });
  } else {
    // Don't refresh the heartbeat, and flip to ERROR immediately rather
    // than waiting out the stale-check window — we just asked LiveKit
    // directly and it said no one's publishing, so there's nothing left
    // to wait for.
    const current = await db.station.findUnique({ where: { id: station.id } });
    if (current?.status === "LIVE") {
      await db.station.update({ where: { id: station.id }, data: { status: "ERROR" } });
      await publishEvent({
        type: "station:status",
        tournamentId: station.tournamentId,
        stationId: station.id,
        status: "ERROR",
        lastHeartbeatAt: current.lastHeartbeatAt?.toISOString() ?? null,
      });
    }
  }
}
