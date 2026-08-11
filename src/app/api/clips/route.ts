import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getClipQueue } from "@/lib/queue";
import { clipCreationRateLimit } from "@/lib/rate-limit";

const createClipSchema = z.object({
  matchId: z.string(),
  startSeconds: z.number().int().min(0),
  endSeconds: z.number().int().min(0),
  title: z.string().optional(),
});

// POST /api/clips — powers both the viewer-facing "clip this" button and
// the "instant replay last 30s" button (which just computes
// startSeconds/endSeconds relative to the match's current playhead
// client-side and calls this same endpoint). Any signed-in viewer can
// request a clip, not just organizers — clipping is a viewer feature.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to create clips" }, { status: 401 });

  const { success } = await clipCreationRateLimit.limit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many clip requests — try again in a minute" },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = createClipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { matchId, startSeconds, endSeconds, title } = parsed.data;
  if (endSeconds <= startSeconds || endSeconds - startSeconds > 90) {
    return NextResponse.json({ error: "Clips must be 1–90 seconds" }, { status: 400 });
  }

  const recording = await db.recording.findUnique({ where: { matchId } });
  if (!recording?.hlsPlaylistKey) {
    return NextResponse.json({ error: "No recording available for this match yet" }, { status: 404 });
  }

  const clip = await db.clip.create({
    data: { matchId, createdById: user.id, title, startSeconds, endSeconds, status: "QUEUED" },
  });

  await getClipQueue().add("cut-clip", {
    clipId: clip.id,
    matchId,
    hlsPlaylistKey: recording.hlsPlaylistKey,
    startSeconds,
    endSeconds,
  });

  return NextResponse.json({ clip }, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

  const clips = await db.clip.findMany({
    where: { matchId, status: "READY" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ clips });
}
