import { NextResponse } from "next/server";
import { recordWatchSeconds } from "@/lib/analytics";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { matchId?: string; seconds?: number } | null;
  if (!body?.matchId || !Number.isFinite(body.seconds)) return NextResponse.json({ error: "matchId and seconds are required" }, { status: 400 });
  const sessionId = req.headers.get("x-viewer-session")?.slice(0, 128) || undefined;
  await recordWatchSeconds(body.matchId, Number(body.seconds), sessionId);
  return NextResponse.json({ ok: true });
}
