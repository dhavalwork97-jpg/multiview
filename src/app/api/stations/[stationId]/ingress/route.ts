import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { ensureCustomerStationStream } from "@/lib/broadcast/youtube-station";

// POST /api/stations/:stationId/ingress — preserved route name for the
// existing admin UI. It provisions/reuses the station's YouTube Live Stream
// using the YouTube channel connected to this tournament.
export async function POST(req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  try { await requireTournamentManage(station.tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  try {
    const vercelOidcToken = req.headers.get("x-vercel-oidc-token") ?? undefined;
    const credentials = await ensureCustomerStationStream(stationId, vercelOidcToken);
    return NextResponse.json(credentials);
  } catch (error) {
    console.error("[youtube customer station stream]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create YouTube Live Stream" },
      { status: 503 },
    );
  }
}
