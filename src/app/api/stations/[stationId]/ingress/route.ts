import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createStationIngress, deleteStationIngress } from "@/lib/livekit";

// POST /api/stations/:stationId/ingress — organizer clicks "Get streaming
// credentials" for a station in the setup flow. Returns the RTMP URL +
// stream key to punch into the encoder box at that PS5 setup. Safe to
// call again for the same station (e.g. a box got swapped) — the old
// ingress is torn down first so a stale stream key can't be used to
// impersonate the station afterward.
export async function POST(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  if (station.ingressId) {
    await deleteStationIngress(station.ingressId).catch(() => {
      // best-effort — an already-deleted or unreachable old ingress
      // shouldn't block issuing a new one
    });
  }

  const { roomName, ingressId, ingestUrl, streamKey } = await createStationIngress(
    station.id,
    station.label
  );

  const updated = await db.station.update({
    where: { id: station.id },
    data: {
      ingressId,
      ingestUrl,
      streamKey,
      playbackIdWebrtc: roomName,
    },
  });

  return NextResponse.json({
    ingestUrl: updated.ingestUrl,
    streamKey: updated.streamKey,
    // ^ this is the only response where the raw stream key is ever
    // returned — treat it like a password; whoever holds it can publish
    // as this station.
  });
}
