import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ q: z.string().trim().min(2).max(40), limit: z.coerce.number().int().min(1).max(20).default(10) });

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const term = parsed.data.q.toLowerCase();
  const users = await db.user.findMany({
    where: { id: { not: me.id }, OR: [{ username: { contains: term, mode: "insensitive" } }, { displayName: { contains: term, mode: "insensitive" } }] },
    take: parsed.data.limit,
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    orderBy: { username: "asc" },
  });
  const following = await db.$queryRaw<Array<{ followingId: string }>>`SELECT "followingId" FROM "user_follows" WHERE "followerId" = ${me.id} AND "followingId" IN (${db.$queryRawUnsafe(users.map(() => "?").join(","))})`;
  const followed = new Set(following.map((row) => row.followingId));
  return NextResponse.json({ users: users.map((user) => ({ ...user, following: followed.has(user.id) })) }, { headers: { "Cache-Control": "no-store" } });
}