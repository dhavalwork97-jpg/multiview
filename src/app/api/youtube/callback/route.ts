import { NextResponse } from "next/server";
import { exchangeYouTubeCode } from "@/lib/youtube";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return new NextResponse(`YouTube OAuth failed: ${error}`, { status: 400 });
  const code = url.searchParams.get("code");
  if (!code) return new NextResponse("Missing OAuth code", { status: 400 });

  try {
    const tokens = await exchangeYouTubeCode(code);
    return new NextResponse(
      `<!doctype html><html><body style="font-family:system-ui;padding:40px;max-width:900px;margin:auto"><h1>YouTube connected</h1><p>Add this value to Vercel as <b>YOUTUBE_REFRESH_TOKEN</b>. Do not share it.</p><textarea style="width:100%;height:120px">${tokens.refresh_token}</textarea><p>After saving the environment variable, redeploy the Vercel app.</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e) {
    return new NextResponse(`YouTube OAuth exchange failed: ${e instanceof Error ? e.message : "unknown error"}`, { status: 500 });
  }
}
