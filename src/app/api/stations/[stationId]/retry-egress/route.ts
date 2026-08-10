import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { roomNameForStation } from "@/lib/livekit";
import { tryStartEgressForStation } from "@/lib/egress-orchestration";

// POST /api/stations/:stationId/retry-egress — "Retry stream" button for
// an organizer looking at a station that the LiveKit room chip says is
// LIVE but that never got a playback source (no HLS, no WebRTC fallback
// showing anything). The automatic path (room_started, then a
// track_published retry — see src/app/api/webhooks/livekit/route.ts)
// covers the common "video track wasn't published yet" race, but a
// webhook delivery can still be lost outright (network blip between
// LiveKit and Vercel) with no further event to retry on. This just
// re-runs the exact same egress-start attempt on demand.
export async function POST(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  if (station.status !== "LIVE") {
    return NextResponse.json(
      { error: "Station isn't LIVE — nothing to start egress for" },
      { status: 400 }
    );
  }

  await tryStartEgressForStation(station, roomNameForStation(station.id));

  // tryStartEgressForStation doesn't throw on the benign "no track yet"
  // case (by design — see its own comment), so re-check what actually
  // happened rather than assuming success just because nothing threw.
  const refreshed = await db.station.findUnique({ where: { id: stationId } });
  return NextResponse.json({
    started: !!refreshed?.playbackIdHls && refreshed.playbackIdHls !== station.playbackIdHls,
    station: refreshed,
  });
}
