import { NextResponse } from "next/server";
import { recordWatchSeconds } from "@/lib/analytics";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { matchId?: string; seconds?: number } | null;
  if (!body?.matchId || !Number.isFinite(body.seconds)) return NextResponse.json({ error: "matchId and seconds are required" }, { status: 400 });
  await recordWatchSeconds(body.matchId, Number(body.seconds));
  return NextResponse.json({ ok: true });
}
