import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { getHudPackage } from "@/lib/hud/packages";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { tournamentId?: string; packageId?: string; stationId?: string | null };
  if (!body.tournamentId || !body.packageId) return NextResponse.json({ error: "tournamentId and packageId are required" }, { status: 400 });

  const pkg = getHudPackage(body.packageId);
  if (!pkg) return NextResponse.json({ error: "Unknown HUD package" }, { status: 404 });

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  const existing = await db.broadcastState.findUnique({ where: { tournamentId: body.tournamentId }, select: { scene: true, matchId: true, stationId: true, overlay: true } });
  const previousOverlay = existing?.overlay && typeof existing.overlay === "object" && !Array.isArray(existing.overlay) ? existing.overlay as Record<string, unknown> : {};

  // HUD Studio may send a logical/default station such as "main". BroadcastState.stationId
  // is a foreign key to the tournament's real Station record, so only persist a station id
  // that actually belongs to this tournament. Otherwise preserve the current assignment.
  const requestedStationId = body.stationId?.trim() || null;
  const requestedStation = requestedStationId
    ? await db.station.findFirst({ where: { id: requestedStationId, tournamentId: body.tournamentId }, select: { id: true } })
    : null;
  const stationId = requestedStation?.id ?? existing?.stationId ?? null;
  const overlay = { ...previousOverlay, hudPackageId: pkg.id, hudPackageName: pkg.name };

  await db.broadcastState.upsert({
    where: { tournamentId: body.tournamentId },
    create: { tournamentId: body.tournamentId, scene: existing?.scene ?? "OFFLINE", matchId: existing?.matchId ?? null, stationId, overlay: JSON.parse(JSON.stringify(overlay)) },
    update: { stationId, overlay: JSON.parse(JSON.stringify(overlay)) },
  });

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: body.tournamentId,
    scene: existing?.scene ?? "gameplay",
    stationId,
    matchId: existing?.matchId ?? null,
    overlay,
    commandType: "HUD_PACKAGE_SET",
  });

  return NextResponse.json({ ok: true, package: pkg, stationId });
}
