import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") ?? 30);
  const days = Math.min(Math.max(Number.isFinite(requestedDays) ? Math.floor(requestedDays) : 30, 7), 90);
  const rows = await db.$queryRaw<Array<{ day: string; total: number; reactions: number; presence: number; matches: number }>>`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE type = 'REACTION')::int AS reactions,
      COUNT(*) FILTER (WHERE type = 'PRESENCE')::int AS presence,
      COUNT(*) FILTER (WHERE type IN ('MATCH_STARTED', 'MATCH_COMPLETED'))::int AS matches
    FROM "activity_events"
    WHERE "userId" = ${me.id}
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY 1 ORDER BY 1 ASC`;
  return NextResponse.json({ days, points: rows }, { headers: { "Cache-Control": "no-store" } });
}