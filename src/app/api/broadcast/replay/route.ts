import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import type { ReplayClip } from "@/lib/broadcast/replay";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { tournamentId?: string; clip?: ReplayClip };
  if (!body.tournamentId || !body.clip?.id || !body.clip.title) {
    return NextResponse.json({ error: "tournamentId and replay clip are required" }, { status: 400 });
  }

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.status === 404 ? "Tournament not found" : "Forbidden" },
      { status: authorization.status },
    );
  }

  const clip = { ...body.clip, durationMs: Math.max(1000, Math.floor(body.clip.durationMs || 10000)) };
  await db.broadcastCommand.create({
    data: {
      tournamentId: body.tournamentId,
      actorUserId: authorization.userId,
      type: "SET_SCENE",
      payload: JSON.parse(JSON.stringify({ runtimeCommandType: "REPLAY_PLAY", clip })),
    },
  });

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
