import { NextResponse } from "next/server";
import { recordMatchView } from "@/lib/analytics";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { matchId?: string } | null;
  if (!body?.matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  const sessionId = req.headers.get("x-viewer-session")?.slice(0, 128) || undefined;
  await recordMatchView(body.matchId, sessionId);
  return NextResponse.json({ ok: true });
}
