import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const url = new URL(request.url);
  const direction = url.searchParams.get("direction") === "followers" ? "followers" : "following";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 30), 1), 50);
  const rows = direction === "following"
    ? await db.$queryRaw<Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; createdAt: Date }>>`
        SELECT u."id", u."username", u."displayName", u."avatarUrl", f."createdAt"
        FROM "user_follows" f JOIN "users" u ON u."id" = f."followingId"
        WHERE f."followerId" = ${me.id} ORDER BY f."createdAt" DESC LIMIT ${limit}`
    : await db.$queryRaw<Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; createdAt: Date }>>`
        SELECT u."id", u."username", u."displayName", u."avatarUrl", f."createdAt"
        FROM "user_follows" f JOIN "users" u ON u."id" = f."followerId"
        WHERE f."followingId" = ${me.id} ORDER BY f."createdAt" DESC LIMIT ${limit}`;
  return NextResponse.json({ users: rows }, { headers });
}