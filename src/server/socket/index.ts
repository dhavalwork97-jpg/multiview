import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { EVENTS_CHANNEL, type AppEvent } from "@/lib/events";
import { serverLogger } from "@/lib/server-logger";
import { startStationHeartbeat } from "./heartbeat";

const PORT = Number(process.env.PORT ?? process.env.SOCKET_SERVER_PORT ?? 4000);
const REDIS_URL = process.env.REDIS_URL?.trim() || null;
const OBS_BRIDGE_TOKEN = process.env.FGC_OBS_BRIDGE_TOKEN?.trim() || null;

const adapterPubClient = REDIS_URL ? new Redis(REDIS_URL, { lazyConnect: true }) : null;
const adapterSubClient = adapterPubClient ? adapterPubClient.duplicate() : null;
const eventsSubscriber = REDIS_URL ? new Redis(REDIS_URL, { lazyConnect: true }) : null;

for (const [name, client] of [
  ["socket adapter publisher", adapterPubClient],
  ["socket adapter subscriber", adapterSubClient],
  ["socket event subscriber", eventsSubscriber],
] as const) {
  client?.on("error", (error) =>
    serverLogger.warn(`${name} Redis client error`, { error: error instanceof Error ? error.message : "unknown_error" }),
  );
}

const io = new Server(createServer(), {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
});
const httpServer = io.httpServer!;

function emitRealtimeEvent(event: AppEvent) {
  switch (event.type) {
    case "broadcast:updated":
      io.to(`tournament:${event.tournamentId}`).emit("broadcast:updated", event);
      io.to("obs-bridge").emit("broadcast:updated", event);
      break;
    case "match:updated": io.to(`tournament:${event.tournamentId}`).emit("match:updated", event); io.to(`match:${event.matchId}`).emit("match:updated", event); break;
    case "station:status": io.to(`tournament:${event.tournamentId}`).emit("station:status", event); break;
    case "match:assigned": io.to(`tournament:${event.tournamentId}`).emit("match:assigned", event); break;
    case "bracket:advanced": io.to(`tournament:${event.tournamentId}`).emit("bracket:advanced", event); break;
    case "clip:ready": io.to(`match:${event.matchId}`).emit("clip:ready", event); io.to(`tournament:${event.tournamentId}`).emit("clip:ready", event); break;
    case "competition:updated": io.to(`tournament:${event.tournamentId}`).emit("competition:updated", event); break;
    case "tournament:completed": io.to(`tournament:${event.tournamentId}`).emit("tournament:completed", event); break;
    case "presence:updated": io.to(`match:${event.matchId}`).emit("presence:updated", event); break;
    case "reaction:created": io.to(`match:${event.matchId}`).emit("reaction:created", event); break;
    case "activity:created": io.emit("activity:created", event); if (event.matchId) io.to(`match:${event.matchId}`).emit("activity:created", event); break;
    case "pulse:updated": io.to(`match:${event.matchId}`).emit("pulse:updated", event); break;
    case "chat:message": io.to(`match:${event.matchId}`).emit("chat:message", event); break;
    case "chat:moderated": io.to(`match:${event.matchId}`).emit("chat:moderated", event); break;
  }
}

const requestHandler = async (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => {
  if (req.url === "/" || req.url === "/healthz") {
    const redisReady = !REDIS_URL || (adapterPubClient?.status === "ready" && eventsSubscriber?.status === "ready");
    res.writeHead(redisReady ? 200 : 503, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end(redisReady ? "ok" : "degraded");
    return;
  }
  if (req.url === "/internal/events" && req.method === "POST") {
    const token = req.headers["x-fgc-internal-token"];
    if (!OBS_BRIDGE_TOKEN || token !== OBS_BRIDGE_TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    try {
      const event = JSON.parse(Buffer.concat(chunks).toString("utf8")) as AppEvent;
      if (event.type !== "broadcast:updated" || !event.tournamentId || !event.scene) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid broadcast event" }));
        return;
      }
      emitRealtimeEvent(event);
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid event payload" }));
    }
    return;
  }
  res.writeHead(404);
  res.end();
};

// Socket.IO owns the HTTP upgrade path; attach the health/internal handler to
// the underlying server before listening.
httpServer.removeAllListeners("request");
httpServer.on("request", requestHandler);

async function connectRedis() {
  if (!REDIS_URL || !adapterPubClient || !adapterSubClient || !eventsSubscriber) return;
  try {
    await Promise.all([adapterPubClient.connect(), adapterSubClient.connect(), eventsSubscriber.connect()]);
    io.adapter(createAdapter(adapterPubClient, adapterSubClient));
    await eventsSubscriber.subscribe(EVENTS_CHANNEL);
    eventsSubscriber.on("message", (_channel, raw) => {
      try { emitRealtimeEvent(JSON.parse(raw) as AppEvent); }
      catch { serverLogger.warn("socket ignored malformed realtime event"); }
    });
    serverLogger.info("socket Redis adapter connected");
  } catch (error) {
    serverLogger.warn("socket Redis unavailable; continuing with in-memory adapter", { error: error instanceof Error ? error.message : "unknown_error" });
    for (const client of [adapterPubClient, adapterSubClient, eventsSubscriber]) client?.disconnect();
  }
}

io.on("connection", (socket) => {
  socket.on("join:tournament", (tournamentId: string) => { if (typeof tournamentId === "string" && tournamentId.length <= 100) socket.join(`tournament:${tournamentId}`); });
  socket.on("leave:tournament", (tournamentId: string) => socket.leave(`tournament:${tournamentId}`));
  socket.on("join:obs-bridge", (ack?: (result: { ok: boolean; error?: string }) => void) => {
    const token = socket.handshake.auth?.obsBridgeToken;
    if (!OBS_BRIDGE_TOKEN || token !== OBS_BRIDGE_TOKEN) {
      serverLogger.warn("rejected OBS bridge socket connection", { socketId: socket.id });
      ack?.({ ok: false, error: "OBS bridge authentication rejected" });
      return;
    }
    socket.join("obs-bridge");
    serverLogger.info("OBS bridge socket connected", { socketId: socket.id });
    ack?.({ ok: true });
  });
  socket.on("join:party", (code: string) => { if (/^[A-Z0-9]{8}$/.test(code)) socket.join(`party:${code}`); });
  socket.on("leave:party", (code: string) => socket.leave(`party:${code}`));
  socket.on("party:sync", (code: string, state: { position: number; playing: boolean; at: number; actorId: string }) => {
    if (!/^[A-Z0-9]{8}$/.test(code) || !state || typeof state.position !== "number" || typeof state.playing !== "boolean") return;
    socket.to(`party:${code}`).emit("party:sync", { position: Math.max(0, state.position), playing: state.playing, at: Date.now(), actorId: String(state.actorId).slice(0, 80) });
  });
  socket.on("join:match", async (matchId: string) => {
    if (typeof matchId !== "string" || matchId.length > 100) return;
    socket.join(`match:${matchId}`);
    const count = await io.in(`match:${matchId}`).allSockets();
    io.to(`match:${matchId}`).emit("viewer:count", { matchId, count: count.size });
  });
  socket.on("leave:match", async (matchId: string) => {
    if (typeof matchId !== "string" || matchId.length > 100) return;
    socket.leave(`match:${matchId}`);
    const count = await io.in(`match:${matchId}`).allSockets();
    io.to(`match:${matchId}`).emit("viewer:count", { matchId, count: count.size });
  });
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) if (room.startsWith("match:")) {
      const matchId = room.slice("match:".length);
      io.in(room).allSockets().then((set) => io.to(room).emit("viewer:count", { matchId, count: Math.max(set.size - 1, 0) })).catch((error) => serverLogger.warn("failed to recompute viewer count", { matchId, error: error instanceof Error ? error.message : "unknown_error" }));
    }
  });
});

httpServer.listen(PORT, () => serverLogger.info("socket server listening", { port: PORT }));
void connectRedis();
startStationHeartbeat();
