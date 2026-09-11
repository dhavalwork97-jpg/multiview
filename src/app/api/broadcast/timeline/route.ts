import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publishEvent } from "@/lib/events";
import {
  DEFAULT_MATCH_TIMELINE,
  createBroadcastCommand,
  getTimelineCue,
} from "@/lib/broadcast/production";
import { resolveObsScene } from "@/lib/broadcast/obs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    tournamentId?: string;
    elapsedMs?: number;
    matchId?: string | null;
    stationId?: string | null;
  };

  if (!body.tournamentId || typeof body.elapsedMs !== "number") {
    return NextResponse.json({ error: "tournamentId and elapsedMs are required" }, { status: 400 });
  }

  const cue = getTimelineCue(DEFAULT_MATCH_TIMELINE, Math.max(0, body.elapsedMs));
  if (!cue) return NextResponse.json({ ok: true, cue: null, command: null });

  const command = createBroadcastCommand(body.tournamentId, cue.command, {
    matchId: body.matchId,
    stationId: body.stationId,
  });

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: command.tournamentId,
    scene: command.scene,
    stationId: command.stationId ?? null,
    matchId: command.matchId ?? null,
    overlay: {
      ...(command.overlay ?? {}),
      obsScene: resolveObsScene(command.scene),
      timelineId: DEFAULT_MATCH_TIMELINE.id,
      cueId: cue.id,
    },
    commandType: command.type,
  });

  return NextResponse.json({
    ok: true,
    cue,
    command,
    obsScene: resolveObsScene(command.scene),
  });
}
