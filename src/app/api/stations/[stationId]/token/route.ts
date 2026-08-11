import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mintViewerToken, roomNameForStation } from "@/lib/livekit";

// GET /api/stations/:stationId/token — used by the WebRTC low-latency
// player (src/components/watch/LiveKitPlayer.tsx). Deliberately separate
// from the HLS path, which needs no token at all (CloudFront URLs are
// public — see STREAMING_ARCHITECTURE.md on why we don't sign HLS URLs
// yet). Signed-out viewers get an anonymous identity so low-latency mode
// still works without requiring an account.
export async function GET(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;

  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  // The LiveKit room name is deterministic for every station. Do not make
  // viewer access depend on playbackIdWebrtc having already been persisted:
  // OBS can connect to the room before the webhook/database state catches up.
  // This was the cause of the 404 that made the low-latency player fail.
  const roomName = station.playbackIdWebrtc ?? roomNameForStation(station.id);

  const wsUrl = process.env.LIVEKIT_WS_URL;
  if (!wsUrl) {
    console.error("[livekit token] LIVEKIT_WS_URL is not configured");
    return NextResponse.json({ error: "LiveKit playback is not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  const identity = user?.id ?? `anon-${crypto.randomUUID()}`;

  const token = await mintViewerToken(roomName, identity);

  return NextResponse.json({
    token,
    wsUrl,
    roomName,
  });
}
