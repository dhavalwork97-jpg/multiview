import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { clientIp, defaultRateLimit } from "@/lib/rate-limit";
import { getMatchPulse, socialSessionHash } from "@/lib/social";

const schema = z.object({ matchId: z.string().min(1).max(64), reaction: z.enum(["🔥", "👏", "😱", "⚡", "💜"]), sessionId: z.string().min(16).max(200) });
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const limited = await defaultRateLimit.limit(`reaction:${clientIp(request)}`);
  if (!limited.success) return NextResponse.json({ error: "Too many reactions" }, { status: 429, headers });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reaction" }, { status: 400, headers });
  const { matchId, reaction, sessionId } = parsed.data;
  const [match, user] = await Promise.all([db.match.findUnique({ where: { id: matchId }, select: { id: true } }), getCurrentUser()]);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404, headers });
  const event = await db.reactionEvent.create({ data: { matchId, reaction, sessionHash: socialSessionHash(sessionId), userId: user?.id } });
  const activity = await db.activityEvent.create({ data: { matchId, userId: user?.id, type: "REACTION", message: `${reaction} reacted to the match`, metadata: { reaction } } });
  const pulse = await getMatchPulse(matchId);
  await Promise.all([
    publishEvent({ type: "reaction:created", matchId, reaction, id: event.id, createdAt: event.createdAt.toISOString() }),
    publishEvent({ type: "activity:created", matchId, id: activity.id, activityType: activity.type, message: activity.message, createdAt: activity.createdAt.toISOString() }),
    publishEvent({ type: "pulse:updated", matchId, ...pulse }),
  ]);
  return NextResponse.json({ id: event.id, ...pulse }, { status: 201, headers });
}
