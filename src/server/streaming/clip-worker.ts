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
const storage = new S3Client({
  region: process.env.SUPABASE_S3_REGION,
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY ?? "",
  },
});

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
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss", String(job.startSeconds),
      "-i", playlistUrl,
      "-t", String(job.endSeconds - job.startSeconds),
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath,
    ]);

    const storageKey = `clips/${job.matchId}/${job.clipId}.mp4`;
    const fileBuffer = await import("node:fs/promises").then((fs) => fs.readFile(outputPath));

    await storage.send(
      new PutObjectCommand({
        Bucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: "video/mp4",
      })
    );

    return storageKey;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

const worker = new Worker<ClipJobData>(
  "clip-generation",
  async (job) => {
    await db.clip.update({ where: { id: job.data.clipId }, data: { status: "PROCESSING" } });

    try {
      const storageKey = await cutClip(job.data);
      const clip = await db.clip.update({
        where: { id: job.data.clipId },
        data: { status: "READY", s3Key: storageKey },
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
        s3Key: storageKey,
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
