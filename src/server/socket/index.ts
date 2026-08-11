import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { EVENTS_CHANNEL, type AppEvent } from "@/lib/events";
import { startStationHeartbeat } from "./heartbeat";

// Standalone process (run via `npm run socket:dev`, deployed separately
// from the Next.js app in Phase 5). Talks to clients over Socket.IO and
// to the rest of the platform over Redis:
//
//   Next.js API route --publish--> Redis channel --subscribe--> this server --emit--> Socket.IO rooms
//
// This indirection is what lets the Next.js app run as N stateless
// instances behind a load balancer while every instance's writes still
// reach every connected viewer, and what lets this socket tier itself
// scale to multiple instances via the Redis Socket.IO adapter (below) —
// without it, a viewer connected to socket-instance-2 would never see an
// event published while connected to socket-instance-1.

const PORT = Number(process.env.PORT ?? process.env.SOCKET_SERVER_PORT ?? 4000);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const httpServer = createServer((req, res) => {
  // Socket.IO only intercepts requests under its own path (/socket.io/*
  // by default) — everything else, including Render's health-check probe
  // hitting plain GET /, would otherwise fall through to nothing and
  // hang with no response. Render reports that as "no open HTTP ports"
  // even though the process is up and the port is genuinely bound, since
  // a TCP handshake succeeding isn't the same as an HTTP response coming
  // back. This handler only needs to cover paths Socket.IO won't already
  // claim.
  if (req.url === "/" || req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
});

// Separate Redis clients: one pair for the Socket.IO cluster adapter
// (required by @socket.io/redis-adapter), one more for subscribing to
// app-level events published by API routes. Three total, none shared,
// because each holds a long-lived SUBSCRIBE state.
const adapterPubClient = new Redis(REDIS_URL);
const adapterSubClient = adapterPubClient.duplicate();
io.adapter(createAdapter(adapterPubClient, adapterSubClient));

const eventsSubscriber = new Redis(REDIS_URL);
eventsSubscriber.subscribe(EVENTS_CHANNEL);

eventsSubscriber.on("message", (_channel, raw) => {
  let event: AppEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }

  switch (event.type) {
    case "match:updated":
      // Two rooms: the tournament room (for the live grid, which cares
      // about every match) and the match room (for viewers on the watch
      // page of that specific match, which cares about nothing else).
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
  }
});

io.on("connection", (socket) => {
  socket.on("join:tournament", (tournamentId: string) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on("leave:tournament", (tournamentId: string) => {
    socket.leave(`tournament:${tournamentId}`);
  });

  // Viewer counts are room-scoped and computed on demand rather than
  // tracked in a separate counter — Socket.IO's adapter already knows
  // room membership across the whole cluster, so this stays correct
  // under horizontal scaling without extra bookkeeping.
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
    // Recompute viewer counts for every match room this socket was in.
    for (const room of socket.rooms) {
      if (room.startsWith("match:")) {
        const matchId = room.slice("match:".length);
        io.in(room)
          .allSockets()
          .then((set) => {
            // -1 because this socket hasn't left the room yet at this point
            io.to(room).emit("viewer:count", { matchId, count: Math.max(set.size - 1, 0) });
          });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on :${PORT}`);
});

// This is the one persistent, always-on process in the stack (see
// src/server/socket/heartbeat.ts for why it lives here rather than a
// Vercel API route) — station health monitoring runs from here.
startStationHeartbeat();
