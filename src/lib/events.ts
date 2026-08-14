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
    }
  | {
      type: "tournament:completed";
      tournamentId: string;
    }
  | {
      type: "clip:ready";
      tournamentId: string;
      matchId: string;
      clipId: string;
      s3Key: string;
    }
  | {
      // Fired alongside match:updated when advanceBracket() (see
      // src/lib/bracket-progression.ts) instantiates or updates the next
      // round's Match row. InteractiveBracket already refetches on
      // match:updated, so no client currently needs to handle this
      // separately — it exists so a future consumer (e.g. a toast, or an
      // analytics hook) doesn't have to infer "the bracket changed" from
      // match:updated's shape.
      type: "bracket:advanced";
      tournamentId: string;
      bracketId: string;
      matchId: string;
    };

let connected = false;
async function ensureConnected() {
  if (!redisPub) return false;
  if (!connected) {
    try {
      await redisPub.connect();
      connected = true;
    } catch {
      return false;
    }
  }
  return true;
}

export async function publishEvent(event: AppEvent) {
  if (!(await ensureConnected()) || !redisPub) return;
  try {
    await redisPub.publish(EVENTS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    // Realtime fan-out must never make a successful database mutation fail.
    console.error("[redis] failed to publish realtime event", error);
  }
}
