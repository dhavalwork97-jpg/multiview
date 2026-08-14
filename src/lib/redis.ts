import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisPub: Redis | null | undefined;
  redisSub: Redis | null | undefined;
};

const REDIS_URL = process.env.REDIS_URL ?? (process.env.NODE_ENV === "production" ? null : "redis://localhost:6379");

// API routes are allowed to run without Redis. This is intentional: Redis is
// an enhancement for realtime fan-out, not the source of truth for matches,
// brackets, or streaming. Production must still configure REDIS_URL if live
// Socket.IO updates are required.
export const redisPub = REDIS_URL
  ? globalForRedis.redisPub ?? new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false })
  : null;

export const redisSub = REDIS_URL
  ? globalForRedis.redisSub ?? new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false })
  : null;

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisPub = redisPub;
  globalForRedis.redisSub = redisSub;
}

export const EVENTS_CHANNEL = "fgc:events";
