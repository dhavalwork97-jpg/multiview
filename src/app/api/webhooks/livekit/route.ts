import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { TrackType } from "@livekit/protocol";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { stopEgress, ingressParticipantIdentity } from "@/lib/livekit";
import { tryStartEgressForStation } from "@/lib/egress-orchestration";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

// This is the nerve center of the streaming pipeline: every room/egress
// state change from the self-hosted LiveKit stack (infra/livekit) lands
// here, gets translated into our domain model (Station.status,
// Recording rows), and re-published through the same Redis→Socket.IO
// pipe from Phase 2 — so a station going live shows up on the dashboard
// grid the same way a score update does, with no separate code path.
export async function POST(req: Request) {
  const body = await req.text();
  const authHeader = req.headers.get("Authorization") ?? "";

  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  // Dedupe on LiveKit's own event id before doing anything else. Previously
  // the only guard was re-checking LiveKit's *current* egress state right
  // before starting one, which stops a duplicate egress but not a
  // duplicate re-run of everything else in this handler (Match/Recording
  // writes, publishEvent) if the same webhook gets redelivered — which
  // LiveKit does on anything but a fast 2xx, and a flappy connection or a
  // slow response is exactly the kind of thing that triggers a retry.
  if (event.id) {
    try {
      await db.webhookEvent.create({ data: { source: "livekit", eventId: event.id } });
    } catch (err) {
      // Only a genuine unique-constraint violation (P2002) means "we've
      // already processed this exact event id" — safe to skip. Any other
      // failure (missing table because a migration wasn't applied, a
      // dropped connection, etc.) is NOT a duplicate, and treating it as
      // one here used to silently swallow every webhook — room_started,
      // track_published, all of it — with the handler returning 200 and
      // never running any of the actual egress-start logic below. Rethrow
      // so a schema/connection problem stays loud instead of looking
      // exactly like "nothing to do here."
      const isDuplicateKey =
        typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isDuplicateKey) {
        console.error("[livekit webhook] webhookEvent dedupe write failed (not a duplicate):", err);
        throw err;
      }
      console.log(`[livekit webhook] duplicate delivery of event=${event.id} — skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  const roomName = event.room?.name;
  if (!roomName) return NextResponse.json({ received: true });

  const station = await db.station.findFirst({ where: { playbackIdWebrtc: roomName } });
  if (!station) {
    console.warn(`[livekit webhook] ${event.event} for room "${roomName}" — no matching Station.playbackIdWebrtc`);
    return NextResponse.json({ received: true });
  }

  console.log(`[livekit webhook] ${event.event} — room=${roomName} station=${station.id}`);

  switch (event.event) {
    case "room_started": {
      const updated = await db.station.update({
        where: { id: station.id },
        data: { status: "LIVE", lastHeartbeatAt: new Date() },
      });

      // Auto-start recording the instant a station's room goes live —
      // this is what "auto recording" and DVR mean in practice: no
      // organizer has to remember to click "record" on 100+ stations.
      //
      // NOTE: this is the *first* attempt, not the only one. room_started
      // fires the moment the room is created, which can be a second or
      // two before the RTMP ingress has actually finished its handshake
      // and published a video track — startRoomEgress needs a real track
      // id to hand Track Composite egress, so it throws if none exists
      // yet. That's expected and fine here: the track_published case
      // below retries the exact same start attempt the moment a video
      // track actually shows up. Room Composite egress never had this
      // gap (LiveKit resolved participants/tracks server-side, tolerant
      // of the same timing), so this retry path only exists because of
      // the Track Composite switch.
      await tryStartEgressForStation(station, roomName);

      await publishEvent({
        type: "station:status",
        tournamentId: station.tournamentId,
        stationId: station.id,
        status: "LIVE",
        lastHeartbeatAt: updated.lastHeartbeatAt?.toISOString() ?? null,
      });
      break;
    }

    case "track_published": {
      // Retry path for the race described above. Only worth attempting
      // for a video track from the station's own ingress — an audio-only
      // publish, or a track from anyone else, isn't what egress is
      // waiting on. listEgress inside tryStartEgressForStation already
      // no-ops this if egress is somehow already running (e.g. this fires
      // after a video track that room_started's attempt already caught).
      const isIngressVideo =
        event.track?.type === TrackType.VIDEO &&
        event.participant?.identity === ingressParticipantIdentity(station.id);
      if (isIngressVideo) {
        await tryStartEgressForStation(station, roomName);
      }
      break;
    }

    case "room_finished": {
      console.log(`[livekit webhook] room_finished station=${station.id} — encoder disconnected or room closed by LiveKit`);

      await db.station.update({ where: { id: station.id }, data: { status: "IDLE" } });

      const recording = await db.recording.findFirst({
        where: { match: { stationId: station.id, status: "LIVE" } },
      });
      if (recording?.egressId) {
        await stopEgress(recording.egressId).catch(() => {});
      }

      await publishEvent({
        type: "station:status",
        tournamentId: station.tournamentId,
        stationId: station.id,
        status: "IDLE",
        lastHeartbeatAt: null,
      });
      break;
    }

    case "egress_ended": {
      const egressId = event.egressInfo?.egressId;
      if (egressId) {
        await db.recording.updateMany({
          where: { egressId },
          data: { status: "READY", endedAt: new Date() },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
