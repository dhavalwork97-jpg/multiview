import { NextResponse } from "next/server";
import { getCompetitionViewerState } from "@/lib/competition/get-viewer-state";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;

  const state = await getCompetitionViewerState(tournamentId);

  if (!state) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}