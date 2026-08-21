import { NextResponse } from "next/server";
import { recordScoreEvent } from "@/lib/match-engine/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await request.json();

    const state = await recordScoreEvent(matchId, body);

    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 400 }
    );
  }
}