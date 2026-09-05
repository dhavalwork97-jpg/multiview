import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 30), 1), 50);
  const friends = await db.$queryRaw<Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; since: Date }>>`
    SELECT u."id", u."username", u."displayName", u."avatarUrl", GREATEST(f1."createdAt", f2."createdAt") AS "since"
    FROM "user_follows" f1
    JOIN "user_follows" f2 ON f2."followerId" = f1."followingId" AND f2."followingId" = f1."followerId"
    JOIN "users" u ON u."id" = f1."followingId"
    WHERE f1."followerId" = ${me.id}
    ORDER BY "since" DESC LIMIT ${limit}`;
  return NextResponse.json({ friends }, { headers: { "Cache-Control": "no-store" } });
}