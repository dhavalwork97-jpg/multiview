import { io } from "socket.io-client";
import { ObsWebSocketClient } from "../src/lib/broadcast/obs-websocket";

type BroadcastUpdated = {
  type?: "broadcast:updated";
  tournamentId?: string;
  scene?: string;
  overlay?: Record<string, unknown> | null;
  commandType?: string;
};

const socketUrl = process.env.FGC_SOCKET_URL?.trim();
const bridgeToken = process.env.FGC_OBS_BRIDGE_TOKEN?.trim();
const configuredTournamentIds = (process.env.FGC_TOURNAMENT_IDS ?? process.env.FGC_TOURNAMENT_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const obsUrl = process.env.OBS_WEBSOCKET_URL?.trim() || "ws://127.0.0.1:4455";
const obsPassword = process.env.OBS_WEBSOCKET_PASSWORD ?? "";

if (!socketUrl) throw new Error("FGC_SOCKET_URL is required");

const obs = new ObsWebSocketClient({ url: obsUrl, password: obsPassword });
const socket = io(socketUrl, {
  auth: bridgeToken ? { obsBridgeToken: bridgeToken } : undefined,
  transports: ["websocket", "polling"],
  reconnection: true,
});

socket.on("connect", async () => {
  console.log(`[FGC→OBS] connected to ${socketUrl}`);

  if (configuredTournamentIds.length) {
    for (const tournamentId of configuredTournamentIds) socket.emit("join:tournament", tournamentId);
    console.log(`[FGC→OBS] filtered tournaments: ${configuredTournamentIds.join(", ")}`);
  } else {
    socket.emit("join:obs-bridge");
    console.log("[FGC→OBS] dynamic tournament mode enabled");
  }

  try {
    await obs.connect();
    console.log(`[FGC→OBS] connected to OBS at ${obsUrl}`);
    console.log(`[FGC→OBS] current OBS scene: ${await obs.getCurrentProgramScene()}`);
  } catch (error) {
    console.error(`[FGC→OBS] OBS connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

socket.on("disconnect", (reason) => console.warn(`[FGC→OBS] FGC socket disconnected: ${reason}`));
socket.on("connect_error", (error) => console.error(`[FGC→OBS] FGC socket error: ${error.message}`));

socket.on("broadcast:updated", async (event: BroadcastUpdated) => {
  if (!event.tournamentId) return;
  if (configuredTournamentIds.length && !configuredTournamentIds.includes(event.tournamentId)) return;

  const sceneName = typeof event.overlay?.obsScene === "string" ? event.overlay.obsScene.trim() : "";
  if (!sceneName) {
    console.warn(`[FGC→OBS] no OBS scene mapping for ${event.scene ?? "unknown"} (${event.tournamentId})`);
    return;
  }

  try {
    await obs.setCurrentProgramScene(sceneName);
    console.log(`[FGC→OBS] ${event.tournamentId}: ${event.scene ?? "unknown"} → ${sceneName}`);
  } catch (error) {
    console.error(`[FGC→OBS] failed to switch to ${sceneName}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const shutdown = () => {
  socket.disconnect();
  obs.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
