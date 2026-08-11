import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ensureStationStream } from "@/lib/youtube";

// POST /api/stations/:stationId/ingress — preserved route name for the
// existing admin UI. It now creates/reuses a YouTube Live Stream instead of
// creating a LiveKit Ingress resource.
export async function POST(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  try {
    const credentials = await ensureStationStream(stationId);
    return NextResponse.json(credentials);
  } catch (error) {
    console.error("[youtube station stream]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create YouTube Live Stream" },
      { status: 503 }
    );
  }
}
