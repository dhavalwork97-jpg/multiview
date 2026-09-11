import { redisPub, EVENTS_CHANNEL } from "@/lib/redis";
import { serverLogger } from "@/lib/server-logger";

export { EVENTS_CHANNEL };

export type AppEvent =
  | { type: "competition:updated"; tournamentId: string; reason: "MATCH_UPDATED" | "RESULT_UPDATED" | "STANDINGS_UPDATED" | "BRACKET_UPDATED" | "LIVE_STATE_UPDATED" }
  | { type: "match:updated"; tournamentId: string; matchId: string; status: string; playerOneScore: number; playerTwoScore: number; winnerId: string | null; winnerSideId?: string | null; sideScores?: { A: number; B: number }; stationId: string | null }
  | { type: "station:status"; tournamentId: string; stationId: string; status: string; lastHeartbeatAt: string | null }
  | { type: "match:assigned"; tournamentId: string; matchId: string; stationId: string | null }
  | { type: "tournament:completed"; tournamentId: string }
  | { type: "clip:ready"; tournamentId: string; matchId: string; clipId: string; s3Key: string }
  | { type: "bracket:advanced"; tournamentId: string; bracketId: string; matchId: string; targetSideKey: string }
  | { type: "broadcast:updated"; tournamentId: string; scene: string; stationId: string | null; matchId: string | null; overlay: Record<string, unknown> | null; commandType: string }
  | { type: "presence:updated"; matchId: string; count: number }
  | { type: "reaction:created"; matchId: string; reaction: string; id: string; createdAt: string }
  | { type: "activity:created"; matchId: string | null; id: string; activityType: string; message: string; createdAt: string }
  | { type: "pulse:updated"; matchId: string; score: number; reactions: number; viewers: number }
  | { type: "chat:message"; matchId: string; message: { id: string; matchId: string; parentId: string | null; body: string; status: string; createdAt: string; user: { id: string; username: string; displayName: string | null; avatarUrl: string | null }; emotes: string[] } }
  | { type: "chat:moderated"; matchId: string; messageId: string; action: "hide" | "delete" | "mute" };

let connected = false;

async function ensureConnected() {
  if (!redisPub) return false;
  if (redisPub.status === "ready") { connected = true; return true; }
  connected = false;
  if (redisPub.status !== "wait") return false;
  try { await redisPub.connect(); connected = true; }
  catch (error) { serverLogger.warn("realtime Redis connection unavailable", { error: error instanceof Error ? error.message : "unknown_error" }); connected = false; }
  return connected;
}

if (redisPub) {
  redisPub.on("error", (error) => {
    connected = false;
    serverLogger.warn("realtime Redis client error", { error: error instanceof Error ? error.message : "unknown_error" });
  });
}

async function relayBroadcastToSocketServer(event: AppEvent) {
  if (event.type !== "broadcast:updated") return;
  const socketUrl = (process.env.FGC_SOCKET_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL)?.trim().replace(/\/$/, "");
  const token = process.env.FGC_SOCKET_INTERNAL_TOKEN?.trim() || process.env.FGC_OBS_BRIDGE_TOKEN?.trim();
  if (!socketUrl || !token) return;
  try {
    const response = await fetch(`${socketUrl}/internal/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-fgc-internal-token": token },
      body: JSON.stringify(event),
      cache: "no-store",
    });
    if (!response.ok) serverLogger.warn("socket broadcast relay rejected", { status: response.status });
  } catch (error) {
    serverLogger.warn("socket broadcast relay failed", { error: error instanceof Error ? error.message : "unknown_error" });
  }
}

export async function publishEvent(event: AppEvent) {
  const redisAvailable = await ensureConnected();
  if (redisAvailable && redisPub) {
    try { await redisPub.publish(EVENTS_CHANNEL, JSON.stringify(event)); }
    catch (error) {
      connected = false;
      serverLogger.error("failed to publish realtime event", { eventType: event.type, tournamentId: "tournamentId" in event ? event.tournamentId : undefined, error: error instanceof Error ? error.message : "unknown_error" });
      await relayBroadcastToSocketServer(event);
    }
    return;
  }
  await relayBroadcastToSocketServer(event);
}
