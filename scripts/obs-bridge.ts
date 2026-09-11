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
const tournamentIds = (process.env.FGC_TOURNAMENT_IDS ?? process.env.FGC_TOURNAMENT_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const obsUrl = process.env.OBS_WEBSOCKET_URL?.trim() || "ws://127.0.0.1:4455";
const obsPassword = process.env.OBS_WEBSOCKET_PASSWORD ?? "";

if (!socketUrl) throw new Error("FGC_SOCKET_URL is required");
if (!tournamentIds.length) throw new Error("FGC_TOURNAMENT_ID or FGC_TOURNAMENT_IDS is required");

const obs = new ObsWebSocketClient({ url: obsUrl, password: obsPassword });
const socket = io(socketUrl, { transports: ["websocket", "polling"], reconnection: true });

socket.on("connect", async () => {
  console.log(`[FGC→OBS] connected to ${socketUrl}`);
  for (const tournamentId of tournamentIds) socket.emit("join:tournament", tournamentId);
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
  if (!event.tournamentId || !tournamentIds.includes(event.tournamentId)) return;
  const sceneName = typeof event.overlay?.obsScene === "string" ? event.overlay.obsScene.trim() : "";
  if (!sceneName) {
    console.warn(`[FGC→OBS] no OBS scene mapping for ${event.scene ?? "unknown"}`);
    return;
  }

  try {
    await obs.setCurrentProgramScene(sceneName);
    console.log(`[FGC→OBS] ${event.scene ?? "unknown"} → ${sceneName}`);
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
