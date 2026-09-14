import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";

const schema = z.object({ teamId: z.string().min(1), seed: z.number().int().positive().optional() });

export async function GET(_: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const teams = await db.tournamentTeam.findMany({
    where: { tournamentId },
    include: { team: { include: { members: { include: { player: true } } } } },
    orderBy: { seed: "asc" },
  });
  return NextResponse.json({ teams });
}

export async function POST(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Tournament management access required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const team = await db.team.findUnique({
    where: { id: parsed.data.teamId },
    include: { members: { include: { player: true } } },
  });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const existing = await db.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
  });
  if (existing) return NextResponse.json({ error: "Team is already registered", team }, { status: 409 });

  const tournamentTeam = await db.tournamentTeam.create({
    data: { tournamentId, teamId: team.id, seed: parsed.data.seed },
    include: { team: { include: { members: { include: { player: true } } } } },
  });

  return NextResponse.json({ team: tournamentTeam.team }, { status: 201 });
}
