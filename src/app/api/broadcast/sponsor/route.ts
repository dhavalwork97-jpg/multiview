import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { normalizeSponsor, type BroadcastSponsor } from "@/lib/broadcast/sponsor";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { tournamentId?: string; sponsor?: Partial<BroadcastSponsor> };
  if (!body.tournamentId || !body.sponsor) return NextResponse.json({ error: "tournamentId and sponsor are required" }, { status: 400 });

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.status === 404 ? "Tournament not found" : "Forbidden" },
      { status: authorization.status },
    );
  }

  const sponsor = normalizeSponsor(body.sponsor);
  await db.broadcastCommand.create({
    data: {
      tournamentId: body.tournamentId,
      actorUserId: authorization.userId,
      type: "SET_SCENE",
      payload: JSON.parse(JSON.stringify({ runtimeCommandType: "SPONSOR_BUMPER", kind: "sponsor", sponsor })),
    },
  });

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: body.tournamentId,
    scene: "gameplay",
    stationId: null,
    matchId: null,
    overlay: { kind: "sponsor", sponsor },
    commandType: "SPONSOR_BUMPER",
  });
  return NextResponse.json({ ok: true, sponsor });
}
