import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Vercel/serverless-safe REST limiter. In production the credentials are
// expected; in local builds/tests we deliberately use a fail-open limiter so
// missing optional Redis credentials do not create noisy connection attempts
// or make `next build` fail while unrelated pages are being generated.
const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = configured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const fallback = {
  async limit(key: string) {
    void key;
    const production = process.env.NODE_ENV === "production";
    return {
      success: !production,
      limit: production ? 0 : Number.MAX_SAFE_INTEGER,
      remaining: production ? 0 : Number.MAX_SAFE_INTEGER,
      reset: Date.now() + 60_000,
    };
  },
};

/** Public search: 20 requests per 10 seconds per IP. */
export const searchRateLimit = configured
  ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(20, "10 s"), prefix: "ratelimit:search" })
  : fallback;

/** Clip creation: 5 requests per minute per signed-in user. */
export const clipCreationRateLimit = configured
  ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "ratelimit:clips" })
  : fallback;

/** Generic fallback for write endpoints. */
export const defaultRateLimit = configured
  ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(30, "60 s"), prefix: "ratelimit:default" })
  : fallback;

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
