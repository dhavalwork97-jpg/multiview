import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mintViewerToken } from "@/lib/livekit";

// GET /api/stations/:stationId/token — used by the WebRTC low-latency
// player (src/components/watch/LiveKitPlayer.tsx). Deliberately separate
// from the HLS path, which needs no token at all (CloudFront URLs are
// public — see STREAMING_ARCHITECTURE.md on why we don't sign HLS URLs
// yet). Signed-out viewers get an anonymous identity so low-latency mode
// still works without requiring an account.
export async function GET(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;

  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station?.playbackIdWebrtc) {
    return NextResponse.json({ error: "Station is not streaming" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const identity = user?.id ?? `anon-${crypto.randomUUID()}`;

  const token = await mintViewerToken(station.playbackIdWebrtc, identity);

  return NextResponse.json({
    token,
    wsUrl: process.env.LIVEKIT_WS_URL,
    roomName: station.playbackIdWebrtc,
  });
}
