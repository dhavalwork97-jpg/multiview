import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, defaultRateLimit } from "@/lib/rate-limit";

const headers = { "Cache-Control": "no-store" };

async function resolveUser(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { id: true, username: true, displayName: true, avatarUrl: true } });
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const limited = await defaultRateLimit.limit(`follow:${clientIp(request)}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { userId } = await params;
  if (userId === me.id) return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400, headers });
  const target = await resolveUser(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404, headers });
  await db.$executeRaw`
    INSERT INTO "user_follows" ("id", "followerId", "followingId")
    VALUES (${crypto.randomUUID()}, ${me.id}, ${target.id})
    ON CONFLICT ("followerId", "followingId") DO NOTHING
  `;
  return NextResponse.json({ following: true, user: target }, { headers });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const limited = await defaultRateLimit.limit(`follow:${clientIp(request)}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { userId } = await params;
  await db.$executeRaw`DELETE FROM "user_follows" WHERE "followerId" = ${me.id} AND "followingId" = ${userId}`;
  return NextResponse.json({ following: false }, { headers });
}