import { db } from "@/lib/db";
import { roomService } from "@/lib/livekit";
import { publishEvent } from "@/lib/events";
import { tryStartEgressForStation } from "@/lib/egress-orchestration";

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
    select: {
      id: true,
      tournamentId: true,
      playbackIdWebrtc: true,
      playbackIdHls: true,
      status: true,
    },
  });

  if (liveStations.length === 0) return;

  await Promise.all(liveStations.map(checkStation));
}

async function checkStation(station: {
  id: string;
  tournamentId: string;
  playbackIdWebrtc: string | null;
  playbackIdHls: string | null;
}) {
  if (!station.playbackIdWebrtc) return;
  const roomName = station.playbackIdWebrtc;

  let isPublishing = false;
  try {
    // Not looking up by a predicted identity (station-${station.id}) —
    // see the comment on startRoomEgress in src/lib/livekit.ts for why
    // that assumption doesn't hold against LiveKit Cloud's hosted RTMP
    // ingress. A station's room only ever has one publisher by design, so
    // just check whether anyone in the room has an actively-publishing
    // (unmuted) track.
    const participants = await roomService.listParticipants(roomName);
    isPublishing = participants.some((p) => p.tracks.some((t) => !t.muted));
  } catch {
    // listParticipants throwing here means the room itself doesn't exist
    // on LiveKit's side at all — encoder disconnected without a clean
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

    // Genuinely publishing, but egress never actually started — either
    // the initial room_started attempt lost the race with OBS's RTMP
    // handshake AND the track_published retry also failed (most likely:
    // LiveKit's egress endpoint rate-limited both attempts, see
    // src/lib/egress-orchestration.ts), or a webhook delivery was lost
    // outright. This poller runs every 20s, which is a far safer retry
    // cadence against a rate limit than hammering the webhook's own
    // retry would be — so just try again here. Cheap when it's already
    // succeeded: tryStartEgressForStation checks LiveKit's own active
    // egress list first and no-ops if one's already running.
    if (!station.playbackIdHls) {
      await tryStartEgressForStation(station, roomName);
    }
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
