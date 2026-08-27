import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage, requireTournamentView } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(1).max(160),
  cueType: z
    .enum([
      "MATCH",
      "BREAK",
      "INTERMISSION",
      "RESULTS",
      "SPONSOR",
      "LOWER_THIRD",
      "VIDEO",
      "CUSTOM",
    ])
    .default("CUSTOM"),
  durationSec: z.number().int().positive().max(86400).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = {
  params: Promise<{ tournamentId: string }>;
};

export async function GET(_req: Request, { params }: Ctx) {
  const { tournamentId } = await params;

  try {
    await requireTournamentView(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cues = await db.broadcastCue.findMany({
    where: { tournamentId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ cues });
}

export async function POST(req: Request, { params }: Ctx) {
  const { tournamentId } = await params;

  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(
    await req.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rundown cue" },
      { status: 400 },
    );
  }

  const last = await db.broadcastCue.aggregate({
    where: { tournamentId },
    _max: { position: true },
  });

  const input = parsed.data;

  const cue = await db.broadcastCue.create({
    data: {
      tournamentId,
      position: (last._max.position ?? -1) + 1,
      title: input.title,
      cueType: input.cueType,
      durationSec: input.durationSec ?? undefined,
      ...(input.payload !== undefined
        ? {
            payload: input.payload as Prisma.InputJsonValue,
          }
        : {}),
    },
  });

  return NextResponse.json({ cue }, { status: 201 });
}