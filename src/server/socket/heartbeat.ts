import { db } from "@/lib/db";
import { syncStationYoutubeStatus } from "@/lib/youtube";

// The socket service remains the station-status fanout process, but LiveKit
// is no longer involved. Every ~20s it asks YouTube for the actual encoder
// and broadcast state and syncs Supabase/Prisma accordingly.
const POLL_INTERVAL_MS = 20_000;
let timer: ReturnType<typeof setInterval> | null = null;

export function startStationHeartbeat() {
  if (timer) return;
  void pollStations();
  timer = setInterval(() => void pollStations(), POLL_INTERVAL_MS);
}

async function pollStations() {
  try {
    const stations = await db.station.findMany({
      where: { youtubeStreamId: { not: null } },
      select: { id: true },
    });
    await Promise.allSettled(stations.map((s) => syncStationYoutubeStatus(s.id)));
  } catch (error) {
    console.error("[youtube heartbeat] poll failed", error);
  }
}
