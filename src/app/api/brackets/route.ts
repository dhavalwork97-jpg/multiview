import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";

// Bracket topology is stored as JSON (see prisma/schema.prisma comment on
// Bracket) rather than a relational tree, because every bracket source
// (start.gg, Challonge, manual entry) has its own shape and we don't want
// a migration every time a new source's quirks show up. What IS
// relational is Match — once we know two real players are in a slot, we
// create a Match row so streaming/scoring/live-grid logic never has to
// know or care where the bracket came from.
const targetSchema = z.object({ roundIndex: z.number().int().min(0), matchIndex: z.number().int().min(0), slot: z.enum(["playerOneId", "playerTwoId"]) });
const slotSchema = z.object({
  playerOneId: z.string().nullable(),
  playerTwoId: z.string().nullable(),
  round: z.string(),
  winnerTarget: targetSchema.optional(),
  loserTarget: targetSchema.optional(),
});

const importSchema = z.object({
  tournamentId: z.string(),
  name: z.string(),
  format: z.enum(["double_elimination", "single_elimination", "round_robin", "swiss"]),
  source: z.enum(["manual", "start.gg", "challonge"]).default("manual"),
  rounds: z.array(
    z.object({
      name: z.string(),
      matches: z.array(slotSchema),
    })
  ),
});

export async function POST(req: Request) {
  const body = await req.json();
  const accessCheck = importSchema.safeParse(body);
  if (!accessCheck.success) return NextResponse.json({ error: accessCheck.error.flatten() }, { status: 400 });
  try {
    await requireTournamentManage(accessCheck.data.tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = accessCheck;
  const { tournamentId, name, format, rounds } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const bracket = await tx.bracket.create({
      data: {
        tournamentId,
        name,
        format,
        // Structure holds the full shape for rendering (round order, slot
        // positions); the matchId per slot gets backfilled below once
        // real Match rows exist, so the client can link straight from a
        // bracket node to /watch/:matchId.
        structure: rounds,
      },
    });

    const stage = await tx.competitionStage.create({
      data: {
        tournamentId,
        name,
        kind: format === "round_robin" ? "LEAGUE" : format === "swiss" ? "SWISS" : "KNOCKOUT",
        orderIndex: await tx.competitionStage.count({ where: { tournamentId } }),
      },
    });

    const createdMatchIds: string[] = [];

    // Only create a Match row where both players are already known —
    // slots that are still "winner of match X" (playerId === null) get
    // populated by advanceBracket() (src/lib/bracket-progression.ts) once
    // that earlier match actually completes, not at import time.
    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
      const round = rounds[roundIndex];
      for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
        const slot = round.matches[matchIndex];
        if (slot.playerOneId && slot.playerTwoId) {
          const match = await tx.match.create({
            data: {
              tournamentId,
              bracketId: bracket.id,
              stageId: stage.id,
              playerOneId: slot.playerOneId,
              playerTwoId: slot.playerTwoId,
              round: slot.round,
              status: "QUEUED",
              roundIndex,
              matchIndex,
            },
          });
          createdMatchIds.push(match.id);
        }
      }
    }

    return { bracket, createdMatchCount: createdMatchIds.length };
  });

  return NextResponse.json(result, { status: 201 });
}
