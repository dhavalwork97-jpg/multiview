import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMatchPulse } from "@/lib/social";
export async function GET(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (!(await db.match.findUnique({ where: { id: matchId }, select: { id: true } }))) return NextResponse.json({ error: "Match not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(await getMatchPulse(matchId), { headers: { "Cache-Control": "no-store" } });
}
