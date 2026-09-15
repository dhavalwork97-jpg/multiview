import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { createYouTubeOAuthState, youtubeAuthorizationUrl, youtubeOAuthCookieName } from "@/lib/broadcast/youtube-connection";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tournamentId = new URL(request.url).searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  try {
    const state = createYouTubeOAuthState({ tournamentId, clerkUserId: userId });
    const response = NextResponse.redirect(youtubeAuthorizationUrl(state));
    response.cookies.set(youtubeOAuthCookieName(), state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube OAuth is not configured" }, { status: 503 });
  }
}
