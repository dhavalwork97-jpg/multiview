import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { startRoomEgress, stopEgress } from "@/lib/livekit";

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
      const liveMatch = await db.match.findFirst({
        where: { stationId: station.id, status: { in: ["QUEUED", "LIVE"] } },
        orderBy: { createdAt: "desc" },
      });

      console.log(
        `[livekit webhook] room_started station=${station.id} liveMatch=${liveMatch?.id ?? "NONE — egress will not start"}`
      );

      if (liveMatch) {
        const existingRecording = await db.recording.findUnique({
          where: { matchId: liveMatch.id },
        });

        if (existingRecording?.status === "RECORDING" && existingRecording.egressId) {
          // Room flapped (briefly disconnected/reconnected) and fired
          // another room_started before the previous egress actually
          // ended — starting a second one wouldn't just be redundant, it
          // burns another request against LiveKit's egress rate limit
          // for no benefit, since the original egress is still running.
          console.log(
            `[livekit webhook] skipping egress start — already RECORDING for match=${liveMatch.id} egressId=${existingRecording.egressId}`
          );
        } else {
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
            // This used to fail silently (an uncaught throw here previously
            // just bubbled up as a generic 500 with no context on *why*
            // egress didn't start — usually S3/bucket credentials or an
            // unreachable egress service). Logging it explicitly, and
            // still returning 200, so LiveKit doesn't treat this as a
            // delivery failure and start retrying the same webhook.
            console.error(`[livekit webhook] egress failed to start for station=${station.id}:`, err);
          }
        }
      }

      await publishEvent({
        type: "station:status",
        tournamentId: station.tournamentId,
        stationId: station.id,
        status: "LIVE",
        lastHeartbeatAt: updated.lastHeartbeatAt?.toISOString() ?? null,
      });
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
