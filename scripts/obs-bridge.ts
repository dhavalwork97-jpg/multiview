import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
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
const webUrl = (process.env.FGC_WEB_URL?.trim() || "https://multiview-fjtd.vercel.app").replace(/\/$/, "");
// OBS browser sources can retain an old document even after SetInputSettings is
// called with the same URL. A bridge-session cache key guarantees a fresh page
// whenever the local bridge is restarted, which is important after auth/routing
// fixes so OBS cannot keep showing an old Clerk sign-in document.
const bridgeSessionId = randomUUID();

const overlayKinds: Record<string, string> = {
  "starting-soon": "countdown",
  intro: "intro",
  versus: "versus",
  gameplay: "scoreboard",
  timeout: "program",
  replay: "replay",
  winner: "winner",
  champion: "winner",
  brb: "program",
};

if (!socketUrl) throw new Error("FGC_SOCKET_URL is required");

const obs = new ObsWebSocketClient({ url: obsUrl, password: obsPassword });
const socket = io(socketUrl, {
  auth: bridgeToken ? { obsBridgeToken: bridgeToken } : undefined,
  transports: ["websocket", "polling"],
  reconnection: true,
});

async function ensureFgcScene(tournamentId: string, sceneName: string) {
  const kind = overlayKinds[sceneName] ?? "program";
  const overlayUrl = `${webUrl}/broadcast/${encodeURIComponent(tournamentId)}/overlay?kind=${encodeURIComponent(kind)}&obsSession=${bridgeSessionId}`;
  const sourceName = `FGC Overlay — ${sceneName}`;
  await obs.ensureSceneWithBrowserSource(sceneName, sourceName, overlayUrl);
  return { sceneName, overlayUrl, sourceName };
}

socket.on("connect", async () => {
  console.log(`[FGC→OBS] connected to ${socketUrl}`);

  if (configuredTournamentIds.length) {
    for (const tournamentId of configuredTournamentIds) socket.emit("join:tournament", tournamentId);
    console.log(`[FGC→OBS] filtered tournaments: ${configuredTournamentIds.join(", ")}`);
  } else {
    socket.emit("join:obs-bridge", (result: { ok: boolean; error?: string }) => {
      if (result.ok) console.log("[FGC→OBS] authenticated dynamic OBS bridge room");
      else console.error(`[FGC→OBS] bridge room authentication failed: ${result.error ?? "unknown error"}`);
    });
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

  const requestedScene = typeof event.overlay?.obsScene === "string" ? event.overlay.obsScene.trim() : "";
  const sceneName = requestedScene || event.scene?.trim() || "";
  if (!sceneName) {
    console.warn(`[FGC→OBS] no OBS scene mapping for ${event.scene ?? "unknown"} (${event.tournamentId})`);
    return;
  }

  try {
    await ensureFgcScene(event.tournamentId, sceneName);
    await obs.setCurrentProgramScene(sceneName);
    console.log(`[FGC→OBS] ${event.tournamentId}: ${event.scene ?? "unknown"} → ${sceneName}`);
  } catch (error) {
    console.error(`[FGC→OBS] failed to provision/switch ${sceneName}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const shutdown = () => {
  socket.disconnect();
  obs.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
