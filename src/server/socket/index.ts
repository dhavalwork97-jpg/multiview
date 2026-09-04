import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { EVENTS_CHANNEL, type AppEvent } from "@/lib/events";
import { serverLogger } from "@/lib/server-logger";
import { startStationHeartbeat } from "./heartbeat";

// Standalone process (run via `npm run socket:dev`, deployed separately
// from the Next.js app in Phase 5). Talks to clients over Socket.IO and
// to the rest of the platform over Redis.

const PORT = Number(process.env.PORT ?? process.env.SOCKET_SERVER_PORT ?? 4000);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const adapterPubClient = new Redis(REDIS_URL);
const adapterSubClient = adapterPubClient.duplicate();
const eventsSubscriber = new Redis(REDIS_URL);

for (const [name, client] of [
  ["socket adapter publisher", adapterPubClient],
  ["socket adapter subscriber", adapterSubClient],
  ["socket event subscriber", eventsSubscriber],
] as const) {
  client.on("error", (error) => {
    serverLogger.warn(`${name} Redis client error`, {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  });
}

const httpServer = createServer((req, res) => {
  if (req.url === "/" || req.url === "/healthz") {
    const redisReady = adapterPubClient.status === "ready" && eventsSubscriber.status === "ready";
    res.writeHead(redisReady ? 200 : 503, {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    });
    res.end(redisReady ? "ok" : "degraded");
    return;
  }
  res.writeHead(404);
  res.end();
});
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
});
io.adapter(createAdapter(adapterPubClient, adapterSubClient));

eventsSubscriber.subscribe(EVENTS_CHANNEL).catch((error) => {
  serverLogger.error("socket event subscription failed", {
    error: error instanceof Error ? error.message : "unknown_error",
  });
});

eventsSubscriber.on("message", (_channel, raw) => {
  let event: AppEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    serverLogger.warn("socket ignored malformed realtime event");
    return;
  }

  switch (event.type) {
    case "broadcast:updated":
      io.to(`tournament:${event.tournamentId}`).emit("broadcast:updated", event);
      break;
    case "match:updated":
      io.to(`tournament:${event.tournamentId}`).emit("match:updated", event);
      io.to(`match:${event.matchId}`).emit("match:updated", event);
      break;
    case "station:status":
      io.to(`tournament:${event.tournamentId}`).emit("station:status", event);
      break;
    case "match:assigned":
      io.to(`tournament:${event.tournamentId}`).emit("match:assigned", event);
      break;
    case "bracket:advanced":
      io.to(`tournament:${event.tournamentId}`).emit("bracket:advanced", event);
      break;
    case "clip:ready":
      io.to(`match:${event.matchId}`).emit("clip:ready", event);
      io.to(`tournament:${event.tournamentId}`).emit("clip:ready", event);
      break;
    case "competition:updated":
      io.to(`tournament:${event.tournamentId}`).emit("competition:updated", event);
      break;
    case "tournament:completed":
      io.to(`tournament:${event.tournamentId}`).emit("tournament:completed", event);
      break;
  }
});

io.on("connection", (socket) => {
  socket.on("join:tournament", (tournamentId: string) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on("leave:tournament", (tournamentId: string) => {
    socket.leave(`tournament:${tournamentId}`);
  });

  socket.on("join:match", async (matchId: string) => {
    socket.join(`match:${matchId}`);
    const count = await io.in(`match:${matchId}`).allSockets();
    io.to(`match:${matchId}`).emit("viewer:count", { matchId, count: count.size });
  });

  socket.on("leave:match", async (matchId: string) => {
    socket.leave(`match:${matchId}`);
    const count = await io.in(`match:${matchId}`).allSockets();
    io.to(`match:${matchId}`).emit("viewer:count", { matchId, count: count.size });
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room.startsWith("match:")) {
        const matchId = room.slice("match:".length);
        io.in(room)
          .allSockets()
          .then((set) => {
            io.to(room).emit("viewer:count", { matchId, count: Math.max(set.size - 1, 0) });
          })
          .catch((error) => {
            serverLogger.warn("failed to recompute match viewer count", {
              matchId,
              error: error instanceof Error ? error.message : "unknown_error",
            });
          });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  serverLogger.info("socket server listening", { port: PORT });
});

startStationHeartbeat();
