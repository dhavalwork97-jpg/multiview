import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisPub: Redis | undefined;
  redisSub: Redis | undefined;
};

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Two connections, on purpose: once an ioredis client issues SUBSCRIBE it
// can no longer run normal commands, so the publisher (used by Next.js API
// routes) and subscriber (used by the Socket.IO server) must be separate
// clients even though they point at the same Redis instance.
export const redisPub =
  globalForRedis.redisPub ?? new Redis(REDIS_URL, { lazyConnect: true });

export const redisSub =
  globalForRedis.redisSub ?? new Redis(REDIS_URL, { lazyConnect: true });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisPub = redisPub;
  globalForRedis.redisSub = redisSub;
}

// Channel the Socket.IO server subscribes to. API routes publish app
// events here; the socket server fans them out to the right Socket.IO
// rooms. Keeps the Next.js request/response processes fully decoupled
// from the long-lived socket process, which is what lets each scale
// horizontally on its own.
export const EVENTS_CHANNEL = "fgc:events";
