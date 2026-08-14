import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { defaultRateLimit } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limit = await defaultRateLimit.limit(`sponsor-click:${ip}`);
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 }); const { id } = await req.json().catch(() => ({})); if (!id) return NextResponse.json({ error: "id required" }, { status: 400 }); const sponsor = await db.sponsor.update({ where: { id }, data: { clicks: { increment: 1 } }, select: { websiteUrl: true } }); return NextResponse.json({ websiteUrl: sponsor.websiteUrl }); }
