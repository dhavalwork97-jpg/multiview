import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, defaultRateLimit } from "@/lib/rate-limit";
import { getMatchPulse, socialSessionHash } from "@/lib/social";
import { publishEvent } from "@/lib/events";

const sessionSchema = z.object({ sessionId: z.string().min(16).max(200) });
const headers = { "Cache-Control": "no-store" };

export async function GET(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const presence = await db.viewerPresence.findMany({
    where: { matchId, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, take: 6,
    select: { displayName: true, avatarUrl: true, userId: true },
  });
  const pulse = await getMatchPulse(matchId);
  return NextResponse.json({ count: pulse.viewers, viewers: presence }, { headers });
}

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const limited = await defaultRateLimit.limit(`presence:${clientIp(request)}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  const parsed = sessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid presence session" }, { status: 400, headers });
  const { matchId } = await params;
  const [match, user] = await Promise.all([db.match.findUnique({ where: { id: matchId }, select: { id: true } }), getCurrentUser()]);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404, headers });
  const expiresAt = new Date(Date.now() + 75_000);
  await db.viewerPresence.upsert({
    where: { matchId_sessionHash: { matchId, sessionHash: socialSessionHash(parsed.data.sessionId) } },
    create: { matchId, sessionHash: socialSessionHash(parsed.data.sessionId), userId: user?.id, displayName: user?.displayName ?? user?.username, avatarUrl: user?.avatarUrl, expiresAt },
    update: { userId: user?.id, displayName: user?.displayName ?? user?.username, avatarUrl: user?.avatarUrl, lastSeenAt: new Date(), expiresAt },
  });
  const pulse = await getMatchPulse(matchId);
  await Promise.all([publishEvent({ type: "presence:updated", matchId, count: pulse.viewers }), publishEvent({ type: "pulse:updated", matchId, ...pulse })]);
  return NextResponse.json({ count: pulse.viewers }, { headers });
}
