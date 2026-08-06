import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// A second Redis client, deliberately: the app's other Redis usage
// (src/lib/redis.ts, src/lib/queue.ts) is a persistent TCP connection via
// ioredis, which fits the long-lived socket server and BullMQ workers but
// is a poor match for Vercel's serverless functions, which spin up fresh
// per request and shouldn't hold a TCP connection open. @upstash/redis is
// a REST client instead — stateless, works correctly in that environment
// — pointed at the same underlying Upstash database via its REST
// URL/token rather than the redis:// connection string.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Public search: cheap per-request but easy to hammer since it needs no
 * auth. 20 requests per 10s per IP is generous for a real user typing,
 * restrictive for a scraper.
 */
export const searchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  prefix: "ratelimit:search",
});

/**
 * Clip creation: cheap to request, expensive to fulfill (an FFmpeg job).
 * Tighter limit, keyed per signed-in user rather than per IP — this is
 * the endpoint most worth protecting from someone spamming clip requests
 * during a hype match and starving the clip worker for everyone else.
 */
export const clipCreationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:clips",
});

/** Generic fallback for any other write endpoint that needs basic abuse protection. */
export const defaultRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "ratelimit:default",
});

export function clientIp(req: Request): string {
  // Vercel sets x-forwarded-for; fall back to a constant so rate limiting
  // still functions (just less precisely) in local/non-Vercel environments
  // instead of throwing.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
