import { Worker } from "bullmq";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { cdnUrl } from "@/lib/cdn";
import type { ClipJobData } from "@/lib/queue";
import { startHealthServer } from "@/lib/health-server";

startHealthServer("clip-worker");

const execFileAsync = promisify(execFile);
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Standalone process — deployed to Fly.io as its own app (see
// Dockerfile.worker + fly.clip-worker.toml), separate from both the
// Next.js app and the Socket.IO server, because it has a fundamentally
// different resource profile: it's idle most of the time, then briefly
// CPU-bound (FFmpeg) when a clip is requested. Scaling it independently
// means a clip-generation spike during a hype match can't starve the
// socket server's connection handling.
function connection() {
  const parsed = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
}

async function cutClip(job: ClipJobData) {
  const playlistUrl = cdnUrl(job.hlsPlaylistKey);
  const workDir = await mkdtemp(path.join(tmpdir(), "clip-"));
  const outputPath = path.join(workDir, "clip.mp4");

  try {
    // FFmpeg reads directly from the live/finished HLS playlist over
    // HTTP (via CloudFront) and cuts the requested window — this works
    // whether the match is still in progress (playlist still growing) or
    // long finished, with no separate download-then-cut step.
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss", String(job.startSeconds),
      "-i", playlistUrl,
      "-t", String(job.endSeconds - job.startSeconds),
      "-c", "copy",              // stream copy — no re-encode, so this is fast
      "-movflags", "+faststart", // web-playable without a full download first
      outputPath,
    ]);

    const s3Key = `clips/${job.matchId}/${job.clipId}.mp4`;
    const fileBuffer = await import("node:fs/promises").then((fs) => fs.readFile(outputPath));

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_CLIPS,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: "video/mp4",
      })
    );

    return s3Key;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

const worker = new Worker<ClipJobData>(
  "clip-generation",
  async (job) => {
    await db.clip.update({ where: { id: job.data.clipId }, data: { status: "PROCESSING" } });

    try {
      const s3Key = await cutClip(job.data);
      const clip = await db.clip.update({
        where: { id: job.data.clipId },
        data: { status: "READY", s3Key },
      });

      const match = await db.match.findUniqueOrThrow({
        where: { id: job.data.matchId },
        select: { tournamentId: true },
      });
      await publishEvent({
        type: "clip:ready",
        tournamentId: match.tournamentId,
        matchId: job.data.matchId,
        clipId: clip.id,
        s3Key,
      });

      return clip;
    } catch (err) {
      await db.clip.update({ where: { id: job.data.clipId }, data: { status: "FAILED" } });
      throw err;
    }
  },
  { connection: connection(), concurrency: 4 }
);

worker.on("failed", (job, err) => {
  console.error(`[clip-worker] job ${job?.id} failed:`, err.message);
});

console.log("[clip-worker] listening for clip-generation jobs");
