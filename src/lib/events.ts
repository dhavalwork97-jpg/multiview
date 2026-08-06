import { redisPub, EVENTS_CHANNEL } from "@/lib/redis";

export { EVENTS_CHANNEL };

// The full set of real-time events the platform pushes. Keeping this as a
// discriminated union (rather than stringly-typed channel names per event)
// means the socket server and any future consumer get autocomplete/type
// safety on payload shape.
export type AppEvent =
  | {
      type: "match:updated";
      tournamentId: string;
      matchId: string;
      status: string;
      playerOneScore: number;
      playerTwoScore: number;
      winnerId: string | null;
      stationId: string | null;
    }
  | {
      type: "station:status";
      tournamentId: string;
      stationId: string;
      status: string;
      lastHeartbeatAt: string | null;
    }
  | {
      type: "match:assigned";
      tournamentId: string;
      matchId: string;
      stationId: string;
    };

let connected = false;
async function ensureConnected() {
  if (!connected) {
    await redisPub.connect().catch(() => {
      // already connecting/connected — ioredis throws if connect() is
      // called twice; safe to ignore here.
    });
    connected = true;
  }
}

export async function publishEvent(event: AppEvent) {
  await ensureConnected();
  await redisPub.publish(EVENTS_CHANNEL, JSON.stringify(event));
}
