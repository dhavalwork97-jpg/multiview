import { Queue } from "bullmq";

// BullMQ over the same Upstash Redis used for Socket.IO pub/sub — different
// key namespace (bull:*), no interference. A real job queue (vs. a bare
// Redis list) buys us retry-with-backoff, and visibility into
// stuck/failed jobs, which matters once clip requests are coming from
// hundreds of viewers during a hype match.
const connection = {
  // BullMQ wants host/port/tls rather than a single URL; parse once here
  // so both the API route and the worker use identical connection options.
  ...parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379"),
};

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
}

export type ClipJobData = {
  clipId: string;
  matchId: string;
  hlsPlaylistKey: string;
  startSeconds: number;
  endSeconds: number;
};

export const clipQueue = new Queue<ClipJobData>("clip-generation", { connection });
