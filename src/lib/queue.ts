import { Queue } from "bullmq";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
}

function redisUrl() {
  const value = process.env.REDIS_URL;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is required in production for the clip queue");
  }
  return "redis://localhost:6379";
}

export type ClipJobData = {
  clipId: string;
  matchId: string;
  hlsPlaylistKey: string;
  startSeconds: number;
  endSeconds: number;
};

let queue: Queue<ClipJobData> | undefined;

export function getClipQueue(): Queue<ClipJobData> {
  if (!queue) {
    queue = new Queue<ClipJobData>("clip-generation", { connection: parseRedisUrl(redisUrl()) });
  }
  return queue;
}
