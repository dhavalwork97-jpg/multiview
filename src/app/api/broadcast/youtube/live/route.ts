import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { createYouTubeBroadcast, transitionYouTubeBroadcast } from "@/lib/broadcast/youtube-connection";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const tournamentId = typeof body.tournamentId === "string" ? body.tournamentId : "";
  const action = body.action as "create" | "testing" | "live" | "complete";
  if (!tournamentId || !["create", "testing", "live", "complete"].includes(action)) return NextResponse.json({ error: "tournamentId and a valid action are required" }, { status: 400 });
  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });
  try {
    if (action === "create") {
      const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "FGC Stream Tournament";
      const scheduledStartTime = typeof body.scheduledStartTime === "string" && body.scheduledStartTime ? body.scheduledStartTime : new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const result = await createYouTubeBroadcast(tournamentId, { title, description: typeof body.description === "string" ? body.description : undefined, scheduledStartTime, privacyStatus: body.privacyStatus === "public" || body.privacyStatus === "private" ? body.privacyStatus : "unlisted" });
      return NextResponse.json({ broadcast: result });
    }
    const broadcast = await transitionYouTubeBroadcast(tournamentId, action);
    return NextResponse.json({ broadcast });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube operation failed" }, { status: 502 });
  }
}
