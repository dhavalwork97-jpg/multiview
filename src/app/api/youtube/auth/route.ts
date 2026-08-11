import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { youtubeAuthUrl } from "@/lib/youtube";

export async function GET() {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    return NextResponse.redirect(youtubeAuthUrl());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube OAuth is not configured" }, { status: 503 });
  }
}
