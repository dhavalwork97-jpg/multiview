import { NextResponse } from "next/server";
import { HUD_PACKAGES } from "@/lib/hud/packages";

export async function GET() {
  return NextResponse.json({ version: 1, packages: HUD_PACKAGES });
}
