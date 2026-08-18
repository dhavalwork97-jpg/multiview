import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { createGenericMatch } from "@/lib/match-engine/persistence";
import type { SideInput } from "@/lib/match-engine/types";

const listQuerySchema = z.object({
  tournamentId: z.string().optional(),
  status: z.enum(["QUEUED", "LIVE", "COMPLETED", "DISPUTED"]).optional(),
});

// GET /api/matches — public. This backs the homepage live grid, so it's
// intentionally unauthenticated and cheap: select only what the grid card
// needs, and default to LIVE so the endpoint is fast under load without a
// status filter. Full-text player/station search is a separate route
// (Phase 2) so this one stays a simple indexed query.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    tournamentId: searchParams.get("tournamentId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tournamentId, status } = parsed.data;

  const matches = await db.match.findMany({
    where: {
      status: status ?? "LIVE",
      ...(tournamentId ? { tournamentId } : {}),
    },
    orderBy: [{ hypeScore: "desc" }, { startedAt: "desc" }],
    select: {
      id: true,
      round: true,
      status: true,
      playerOneScore: true,
      playerTwoScore: true,
      startedAt: true,
      hypeScore: true,
      scoringAdapter: true,
      winnerSideId: true,
      sides: { include: { participants: true } },
      playerOne: { select: { id: true, gamertag: true, avatarUrl: true, country: true } },
      playerTwo: { select: { id: true, gamertag: true, avatarUrl: true, country: true } },
      youtubeVideoId: true,
      station: {
        select: { id: true, label: true, youtubeVideoId: true, status: true },
      },
      tournament: { select: { id: true, name: true, slug: true, game: true } },
    },
    take: 200,
  });

  return NextResponse.json({ matches });
}

const participantSchema = z.object({
  playerId: z.string().optional(),
  teamId: z.string().optional(),
  role: z.string().optional(),
  displayName: z.string().optional(),
}).superRefine((value, ctx) => {
  if (Number(Boolean(value.playerId)) + Number(Boolean(value.teamId)) !== 1) {
    ctx.addIssue({ code: "custom", message: "Participant must contain exactly one playerId or teamId" });
  }
});

const sideSchema = z.object({
  key: z.enum(["A", "B"]),
  label: z.string().optional(),
  participants: z.array(participantSchema).min(1),
});

const assignSchema = z.object({
  tournamentId: z.string(),
  bracketId: z.string().optional(),
  stationId: z.string().optional(),
  playerOneId: z.string().optional(),
  playerTwoId: z.string().optional(),
  round: z.string().optional(),
  sport: z.string().optional(),
  scoringAdapter: z.string().optional(),
  rules: z.record(z.unknown()).optional(),
  sides: z.array(sideSchema).length(2).optional(),
}).superRefine((value, ctx) => {
  if (value.sides) return;
  if (!value.playerOneId || !value.playerTwoId) {
    ctx.addIssue({ code: "custom", message: "Provide sides for a generic match, or playerOneId/playerTwoId for a legacy match" });
  }
});

// POST /api/matches — organizer/admin only. Creates (or re-assigns) a match
// onto a station. This is the action the "Assign matches to stations"
// dashboard feature calls.
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try { await requireTournamentManage(parsed.data.tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const tournament = await db.tournament.findUnique({
    where: { id: parsed.data.tournamentId },
    select: { sport: true, competitionRules: true },
  });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  try {
    const match = await db.$transaction(async (tx) => {
      const sides: SideInput[] = parsed.data.sides
        ? parsed.data.sides.map((side) => ({ key: side.key, label: side.label, participants: side.participants }))
        : [
            { key: "A", participants: [{ playerId: parsed.data.playerOneId! }] },
            { key: "B", participants: [{ playerId: parsed.data.playerTwoId! }] },
          ];

      if (parsed.data.sides) {
        for (const side of sides) {
          for (const participant of side.participants) {
            if (participant.playerId) {
              const entrant = await tx.tournamentEntrant.findUnique({
                where: { tournamentId_playerId: { tournamentId: parsed.data.tournamentId, playerId: participant.playerId } },
              });
              if (!entrant) throw new Error(`Player ${participant.playerId} is not registered in this tournament`);
            }
            if (participant.teamId) {
              const team = await tx.tournamentTeam.findUnique({
                where: { tournamentId_teamId: { tournamentId: parsed.data.tournamentId, teamId: participant.teamId } },
              });
              if (!team) throw new Error(`Team ${participant.teamId} is not registered in this tournament`);
            }
          }
        }
      }

      const created = await createGenericMatch(tx, {
        tournamentId: parsed.data.tournamentId,
        bracketId: parsed.data.bracketId,
        stationId: parsed.data.stationId,
        round: parsed.data.round,
        sport: parsed.data.sport ?? tournament.sport,
        rules: (parsed.data.rules ?? tournament.competitionRules) as Record<string, unknown> | null,
        scoringAdapter: parsed.data.scoringAdapter,
        sides,
      });

      // Keep legacy FGC fields populated when the match was created from the
      // old playerOne/playerTwo API so every existing consumer remains valid.
      if (!parsed.data.sides) {
        return tx.match.update({
          where: { id: created.id },
          data: { playerOneId: parsed.data.playerOneId, playerTwoId: parsed.data.playerTwoId },
          include: { sides: { include: { participants: true } } },
        });
      }
      return created;
    });
    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create match" }, { status: 400 });
  }
}
