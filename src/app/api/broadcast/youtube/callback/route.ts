import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { connectYouTube, verifyYouTubeOAuthState, youtubeOAuthCookieName } from "@/lib/broadcast/youtube-connection";

function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("Missing required environment variable NEXT_PUBLIC_APP_URL");
  return value.replace(/\/$/, "");
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Sign in to connect YouTube.", { status: 401 });

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  if (error) return new NextResponse(`YouTube OAuth was cancelled: ${error}`, { status: 400 });
  if (!code || !stateValue) return new NextResponse("Missing YouTube OAuth response.", { status: 400 });

  try {
    const state = verifyYouTubeOAuthState(stateValue);
    if (state.clerkUserId !== userId) return new NextResponse("YouTube OAuth state does not match the signed-in operator.", { status: 403 });
    const cookieState = request.headers.get("cookie")?.match(new RegExp(`${youtubeOAuthCookieName()}=([^;]+)`))?.[1];
    if (!cookieState || cookieState !== stateValue) return new NextResponse("YouTube OAuth session expired. Start the connection again.", { status: 400 });
    const authorization = await authorizeBroadcastOperator(userId, state.tournamentId);
    if (!authorization.ok) return new NextResponse("You do not have access to this tournament.", { status: authorization.status });

    await connectYouTube(state.tournamentId, code);
    const destination = `${appUrl()}/broadcast/${encodeURIComponent(state.tournamentId)}?youtube=connected`;
    const response = NextResponse.redirect(destination);
    response.cookies.set(youtubeOAuthCookieName(), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
    return response;
  } catch (errorValue) {
    return new NextResponse(errorValue instanceof Error ? errorValue.message : "YouTube OAuth failed", { status: 500 });
  }
}
