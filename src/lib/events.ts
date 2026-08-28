import { redisPub, EVENTS_CHANNEL } from "@/lib/redis";

export { EVENTS_CHANNEL };

// The full set of real-time events the platform pushes. Keeping this as a
// discriminated union means the socket server and any future consumer get
// autocomplete and type safety on payload shape.
export type AppEvent =
  | {
      // A competition-level invalidation event. Viewers fetch the
      // canonical snapshot rather than attempting to reconstruct
      // tournament state from individual mutation events.
      type: "competition:updated";
      tournamentId: string;
      reason:
        | "MATCH_UPDATED"
        | "RESULT_UPDATED"
        | "STANDINGS_UPDATED"
        | "BRACKET_UPDATED"
        | "LIVE_STATE_UPDATED";
    }
  | {
      type: "match:updated";
      tournamentId: string;
      matchId: string;
      status: string;
      playerOneScore: number;
      playerTwoScore: number;
      winnerId: string | null;
      winnerSideId?: string | null;
      sideScores?: { A: number; B: number };
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
      type: "bracket:advanced";
      tournamentId: string;
      bracketId: string;
      matchId: string;
      targetSideKey: string;
    }
  | {
      // Published after persistent broadcast director state changes.
      // OBS integration is intentionally not coupled here: a future
      // broadcast agent can consume this event or the command history.
      type: "broadcast:updated";
      tournamentId: string;
      scene: string;
      stationId: string | null;
      matchId: string | null;
      overlay: Record<string, unknown> | null;
      commandType: string;
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