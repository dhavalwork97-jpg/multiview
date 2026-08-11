import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncStationYoutubeStatus } from "@/lib/youtube";

export async function GET(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  try {
    const cached = await db.station.findUnique({
      where: { id: stationId },
      select: { status: true, youtubeVideoId: true, youtubeLiveStatus: true, youtubeLastStatusAt: true },
    });
    if (!cached) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    if (cached.youtubeLastStatusAt && Date.now() - cached.youtubeLastStatusAt.getTime() < 5000) {
      const live = cached.status === "LIVE" && cached.youtubeLiveStatus === "live";
      return NextResponse.json({ station: cached, streamStatus: cached.youtubeLiveStatus, broadcastStatus: cached.youtubeLiveStatus, videoId: cached.youtubeVideoId, isLive: live });
    }

    const result = await syncStationYoutubeStatus(stationId);
    return NextResponse.json({ station: result.station, streamStatus: result.streamStatus, broadcastStatus: result.broadcastStatus, videoId: result.videoId, healthStatus: result.healthStatus, configurationIssues: result.configurationIssues, isLive: result.isLive });
  } catch (error) {
    console.error("[youtube status]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to read YouTube status" }, { status: 503 });
  }
}
