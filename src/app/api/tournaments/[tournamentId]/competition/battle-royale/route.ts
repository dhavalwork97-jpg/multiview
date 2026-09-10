import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { getBattleRoyaleStandings, progressBattleRoyaleStage } from "@/lib/battle-royale-engine";

const resultSchema = z.object({
  playerId: z.string().min(1),
  placement: z.number().int().positive(),
  kills: z.number().int().nonnegative().default(0),
  points: z.number().int().default(0).optional(),
});

const scoreSchema = z.object({
  action: z.literal("score"),
  matchId: z.string().min(1),
  results: z.array(resultSchema).min(1),
  complete: z.boolean().default(true),
});

const progressSchema = z.object({
  action: z.literal("progress"),
  matchId: z.string().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;
  const stageId = new URL(_req.url).searchParams.get("stageId") ?? undefined;
  const standings = await getBattleRoyaleStandings(db, tournamentId, stageId);
  const matches = await db.match.findMany({
    where: { tournamentId, ...(stageId ? { stageId } : { stage: { orderIndex: 0 } }) },
    orderBy: [{ roundIndex: "asc" }, { matchIndex: "asc" }],
    select: { id: true, stageId: true, round: true, status: true, roundIndex: true, matchIndex: true },
  });
  return NextResponse.json({ tournamentId, standings, lobbies: matches });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const { tournamentId } = await params;
  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = body?.action === "score" ? scoreSchema.safeParse(body) : progressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "progress") {
    const match = await db.match.findFirst({ where: { id: parsed.data.matchId, tournamentId, scoringAdapter: "battle_royale" }, select: { id: true, status: true } });
    if (!match) return NextResponse.json({ error: "Battle Royale lobby not found" }, { status: 404 });
    if (match.status !== "COMPLETED") return NextResponse.json({ error: "Lobby must be completed before progression" }, { status: 409 });
    return NextResponse.json(await progressBattleRoyaleStage(db, match.id));
  }

  const match = await db.match.findFirst({
    where: { id: parsed.data.matchId, tournamentId, scoringAdapter: "battle_royale" },
    include: { sides: { include: { participants: true } }, stage: true },
  });
  if (!match) return NextResponse.json({ error: "Battle Royale lobby not found" }, { status: 404 });
  if (!match.stage) return NextResponse.json({ error: "Lobby is not attached to a competition stage" }, { status: 409 });

  const playerIds = new Set(match.sides.flatMap((side) => side.participants.map((participant) => participant.playerId).filter((id): id is string => Boolean(id))));
  const submitted = new Set(parsed.data.results.map((row) => row.playerId));
  for (const result of parsed.data.results) {
    if (!playerIds.has(result.playerId)) return NextResponse.json({ error: `Player ${result.playerId} is not in this lobby` }, { status: 400 });
  }
  if (submitted.size !== playerIds.size) return NextResponse.json({ error: "Submit one result for every lobby participant" }, { status: 400 });
  if (new Set(parsed.data.results.map((row) => row.placement)).size !== parsed.data.results.length) return NextResponse.json({ error: "Placements must be unique within a lobby" }, { status: 400 });

  await db.$transaction(async (tx) => {
    for (const result of parsed.data.results) {
      const side = match.sides.find((candidate) => candidate.participants.some((participant) => participant.playerId === result.playerId));
      if (!side) throw new Error("Lobby participant side not found");
      const nextSequence = (await tx.matchScoreEvent.count({ where: { matchId: match.id } })) + 1;
      const events = [
        { metric: "placement", value: result.placement },
        { metric: "kills", value: result.kills },
        ...(typeof result.points === "number" ? [{ metric: "points", value: result.points }] : []),
      ];
      for (const event of events) {
        await tx.matchScoreEvent.create({ data: { matchId: match.id, sideId: side.id, sequence: nextSequence + events.indexOf(event), metric: event.metric, value: event.value } });
      }
    }
    if (parsed.data.complete) {
      await tx.match.update({ where: { id: match.id }, data: { status: "COMPLETED", endedAt: new Date() } });
    }
  });

  if (!parsed.data.complete) return NextResponse.json(await getBattleRoyaleStandings(db, tournamentId, match.stageId));
  const progression = await progressBattleRoyaleStage(db, match.id);
  return NextResponse.json(progression);
}
