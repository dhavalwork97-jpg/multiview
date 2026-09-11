import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const tournamentId = new URL(request.url).searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });

  const state = await db.broadcastState.findUnique({ where: { tournamentId }, select: { scene: true, stationId: true, matchId: true, overlay: true, updatedAt: true } });
  if (!state) return NextResponse.json({ state: { tournamentId, scene: "starting-soon", commandType: "PROGRAM_CLEAR", stationId: null, matchId: null, overlay: null, updatedAt: new Date(0).toISOString() } });

  const overlay = state.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as Record<string, unknown> : null;
  return NextResponse.json({ state: { tournamentId, scene: typeof overlay?.runtimeScene === "string" ? overlay.runtimeScene : state.scene, commandType: typeof overlay?.commandType === "string" ? overlay.commandType : "SCENE_SET", stationId: state.stationId, matchId: state.matchId, overlay, updatedAt: state.updatedAt.toISOString() } });
}
