import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { publishEvent } from "@/lib/events";
import { db } from "@/lib/db";
import { normalizeObsSceneMapping, resolveObsScene, type ObsSceneMapping } from "@/lib/broadcast/obs";
import type { BroadcastCommand, BroadcastCommandType, BroadcastScene } from "@/lib/broadcast/production";

const scenes: BroadcastScene[] = [
  "starting-soon",
  "intro",
  "versus",
  "gameplay",
  "timeout",
  "replay",
  "winner",
  "champion",
  "brb",
];

const commandTypes: BroadcastCommandType[] = [
  "SCENE_SET",
  "INTRO_PLAY",
  "COUNTDOWN_START",
  "REPLAY_PLAY",
  "WINNER_SHOW",
  "BRB_SHOW",
  "PROGRAM_CLEAR",
];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<BroadcastCommand> & {
    obsMapping?: Partial<ObsSceneMapping> | null;
  };
  if (!body.tournamentId || !body.type || !body.scene) {
    return NextResponse.json({ error: "tournamentId, type and scene are required" }, { status: 400 });
  }

  if (!commandTypes.includes(body.type as BroadcastCommandType)) {
    return NextResponse.json({ error: "Invalid broadcast command type" }, { status: 400 });
  }
  if (!scenes.includes(body.scene as BroadcastScene)) {
    return NextResponse.json({ error: "Invalid broadcast scene" }, { status: 400 });
  }

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.status === 404 ? "Tournament not found" : "Forbidden" },
      { status: authorization.status },
    );
  }

  const command: BroadcastCommand = {
    type: body.type as BroadcastCommandType,
    scene: body.scene as BroadcastScene,
    tournamentId: body.tournamentId,
    matchId: body.matchId ?? null,
    stationId: body.stationId ?? null,
    overlay: body.overlay ?? null,
    issuedAt: new Date().toISOString(),
  };
  const obsScene = resolveObsScene(command.scene, normalizeObsSceneMapping(body.obsMapping));
  const overlay = {
    ...(command.overlay ?? {}),
    obsScene,
  };

  await db.broadcastCommand.create({
    data: {
      tournamentId: command.tournamentId,
      actorUserId: authorization.userId,
      type: "SET_SCENE",
      payload: JSON.parse(JSON.stringify({
        runtimeCommandType: command.type,
        scene: command.scene,
        obsScene,
        matchId: command.matchId,
        stationId: command.stationId,
        overlay,
        issuedAt: command.issuedAt,
      })),
    },
  });

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: command.tournamentId,
    scene: command.scene,
    stationId: command.stationId ?? null,
    matchId: command.matchId ?? null,
    overlay,
    commandType: command.type,
  });

  return NextResponse.json({ ok: true, command: { ...command, overlay }, obsScene });
}
