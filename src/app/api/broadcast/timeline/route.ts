import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { createBroadcastCommand, DEFAULT_MATCH_TIMELINE, getTimelineCue } from "@/lib/broadcast/production";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    tournamentId?: string;
    elapsedMs?: number;
    matchId?: string | null;
    stationId?: string | null;
  };

  if (!body.tournamentId || typeof body.elapsedMs !== "number" || !Number.isFinite(body.elapsedMs)) {
    return NextResponse.json({ error: "tournamentId and elapsedMs are required" }, { status: 400 });
  }

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.status === 404 ? "Tournament not found" : "Forbidden" },
      { status: authorization.status },
    );
  }

  const elapsedMs = Math.max(0, body.elapsedMs);
  const cue = getTimelineCue(DEFAULT_MATCH_TIMELINE, elapsedMs);
  if (!cue) return NextResponse.json({ ok: true, cue: null, command: null });

  const command = createBroadcastCommand(body.tournamentId, cue.command, {
    matchId: body.matchId ?? null,
    stationId: body.stationId ?? null,
  });

  await db.broadcastCommand.create({
    data: {
      tournamentId: command.tournamentId,
      actorUserId: authorization.userId,
      type: command.type,
      payload: {
        scene: command.scene,
        matchId: command.matchId,
        stationId: command.stationId,
        overlay: command.overlay,
        timelineId: DEFAULT_MATCH_TIMELINE.id,
        cueId: cue.id,
        elapsedMs,
        issuedAt: command.issuedAt,
      },
    },
  });

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: command.tournamentId,
    scene: command.scene,
    stationId: command.stationId,
    matchId: command.matchId,
    overlay: {
      ...(command.overlay ?? {}),
      timelineId: DEFAULT_MATCH_TIMELINE.id,
      cueId: cue.id,
    },
    commandType: command.type,
  });

  return NextResponse.json({ ok: true, timelineId: DEFAULT_MATCH_TIMELINE.id, cue, command });
}
