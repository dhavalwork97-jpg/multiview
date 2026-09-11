import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publishEvent } from "@/lib/events";
import type { BroadcastCommand } from "@/lib/broadcast/production";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<BroadcastCommand>;
  if (!body.tournamentId || !body.type || !body.scene) {
    return NextResponse.json({ error: "tournamentId, type and scene are required" }, { status: 400 });
  }

  const command: BroadcastCommand = {
    type: body.type,
    scene: body.scene,
    tournamentId: body.tournamentId,
    matchId: body.matchId ?? null,
    stationId: body.stationId ?? null,
    overlay: body.overlay ?? null,
    issuedAt: new Date().toISOString(),
  };

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: command.tournamentId,
    scene: command.scene,
    stationId: command.stationId ?? null,
    matchId: command.matchId ?? null,
    overlay: command.overlay,
    commandType: command.type,
  });

  return NextResponse.json({ ok: true, command });
}
