import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const query = z.object({ matchId: z.string().max(64).optional(), limit: z.coerce.number().int().min(1).max(50).default(15) });
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const events = await db.activityEvent.findMany({ where: parsed.data.matchId ? { matchId: parsed.data.matchId } : {}, orderBy: { createdAt: "desc" }, take: parsed.data.limit, select: { id: true, type: true, message: true, createdAt: true, metadata: true } });
  return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
}
