import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { publishEvent } from "@/lib/events";

const eventTypes = ["score", "round", "goal", "ko", "match-point"] as const;
type GraphicEventType = (typeof eventTypes)[number];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    tournamentId?: string;
    matchId?: string | null;
    stationId?: string | null;
    eventType?: GraphicEventType;
    scoreA?: number;
    scoreB?: number;
    round?: number;
    roundLabel?: string;
    teamA?: string;
    teamB?: string;
  };

  if (!body.tournamentId || !body.eventType) return NextResponse.json({ error: "tournamentId and eventType are required" }, { status: 400 });
  if (!eventTypes.includes(body.eventType)) return NextResponse.json({ error: "Invalid graphic event type" }, { status: 400 });

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  const overlay = {
    kind: "live-graphics",
    eventType: body.eventType,
    scoreA: Math.max(0, Math.floor(body.scoreA ?? 0)),
    scoreB: Math.max(0, Math.floor(body.scoreB ?? 0)),
    round: Math.max(1, Math.floor(body.round ?? 1)),
    roundLabel: body.roundLabel?.trim() || undefined,
    teamA: body.teamA?.trim() || undefined,
    teamB: body.teamB?.trim() || undefined,
  };

  await publishEvent({
    type: "broadcast:updated",
    tournamentId: body.tournamentId,
    scene: "gameplay",
    stationId: body.stationId ?? null,
    matchId: body.matchId ?? null,
    overlay: JSON.parse(JSON.stringify(overlay)),
    commandType: `GRAPHIC_${body.eventType.toUpperCase()}`,
  });

  return NextResponse.json({ ok: true, overlay });
}
