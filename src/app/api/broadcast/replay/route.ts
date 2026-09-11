import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publishEvent } from "@/lib/events";
import type { ReplayClip } from "@/lib/broadcast/replay";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { tournamentId?: string; clip?: ReplayClip };
  if (!body.tournamentId || !body.clip?.id || !body.clip.title) {
    return NextResponse.json({ error: "tournamentId and replay clip are required" }, { status: 400 });
  }
  const clip = { ...body.clip, durationMs: Math.max(1000, Math.floor(body.clip.durationMs || 10000)) };
  await publishEvent({
    type: "broadcast:updated",
    tournamentId: body.tournamentId,
    scene: "replay",
    stationId: clip.stationId ?? null,
    matchId: clip.matchId ?? null,
    overlay: { kind: "replay", clip },
    commandType: "REPLAY_PLAY",
  });
  return NextResponse.json({ ok: true, clip });
}
