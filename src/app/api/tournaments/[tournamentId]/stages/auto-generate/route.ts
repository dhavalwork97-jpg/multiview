import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { generateMultiStageTournament } from "@/lib/multi-stage-engine";

export async function POST(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await db.$transaction((tx) => generateMultiStageTournament(tx, tournamentId), { timeout: 30_000 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate multi-stage tournament" }, { status: 409 });
  }
}
