import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { mergeBroadcastPersistentState, readBroadcastPersistentState, type BroadcastPersistentState } from "@/lib/broadcast/state";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tournamentId = new URL(request.url).searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  const state = await db.broadcastState.findUnique({ where: { tournamentId }, select: { scene: true, stationId: true, matchId: true, overlay: true, updatedAt: true } });
  const overlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as Record<string, unknown> : null;
  const runtimeScene = typeof overlay?.runtimeScene === "string" ? overlay.runtimeScene : null;
  return NextResponse.json({ scene: runtimeScene ?? state?.scene ?? "OFFLINE", stationId: state?.stationId ?? null, matchId: state?.matchId ?? null, persistent: readBroadcastPersistentState(state?.overlay), updatedAt: state?.updatedAt?.toISOString() ?? null });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { tournamentId?: string; patch?: BroadcastPersistentState };
  if (!body.tournamentId || !body.patch) return NextResponse.json({ error: "tournamentId and patch are required" }, { status: 400 });
  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  const existing = await db.broadcastState.findUnique({ where: { tournamentId: body.tournamentId }, select: { overlay: true, scene: true } });
  const persistent = mergeBroadcastPersistentState(existing?.overlay, body.patch);
  const state = await db.broadcastState.upsert({ where: { tournamentId: body.tournamentId }, create: { tournamentId: body.tournamentId, scene: existing?.scene ?? "OFFLINE", overlay: persistent }, update: { overlay: persistent }, select: { scene: true, overlay: true, updatedAt: true } });
  const overlay = state.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as Record<string, unknown> : null;
  return NextResponse.json({ scene: typeof overlay?.runtimeScene === "string" ? overlay.runtimeScene : state.scene, persistent: readBroadcastPersistentState(state.overlay), updatedAt: state.updatedAt.toISOString() });
}
