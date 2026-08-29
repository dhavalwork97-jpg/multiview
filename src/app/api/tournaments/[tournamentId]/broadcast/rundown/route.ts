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
  matchId: z.string().min(1).optional(),
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

  try {
    const cues = await db.broadcastCue.findMany({
      where: { tournamentId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ cues });
  } catch (error) {
    console.error("Failed to load broadcast rundown:", error);

    return NextResponse.json(
      { error: "Failed to load broadcast rundown" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { tournamentId } = await params;

  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = createSchema.safeParse(await req.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid rundown cue",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (input.cueType === "MATCH") {
      if (!input.matchId) {
        return NextResponse.json(
          { error: "A match cue requires a tournament match" },
          { status: 400 },
        );
      }

      const match = await db.match.findFirst({
        where: {
          id: input.matchId,
          tournamentId,
        },
        select: { id: true },
      });

      if (!match) {
        return NextResponse.json(
          { error: "Match not found in this tournament" },
          { status: 400 },
        );
      }
    } else if (input.matchId) {
      return NextResponse.json(
        { error: "Only MATCH cues can reference a match" },
        { status: 400 },
      );
    }

    const last = await db.broadcastCue.aggregate({
      where: { tournamentId },
      _max: { position: true },
    });

    const payload =
      input.payload !== undefined || input.matchId !== undefined
        ? {
            ...(input.payload ?? {}),
            ...(input.matchId ? { matchId: input.matchId } : {}),
          }
        : undefined;

    const cue = await db.broadcastCue.create({
      data: {
        tournamentId,
        position: (last._max.position ?? -1) + 1,
        title: input.title,
        cueType: input.cueType,
        durationSec: input.durationSec ?? null,
        ...(payload !== undefined
          ? { payload: payload as Prisma.InputJsonValue }
          : {}),
      },
    });

    return NextResponse.json({ cue }, { status: 201 });
  } catch (error) {
    console.error("Failed to create broadcast rundown cue:", error);

    return NextResponse.json(
      { error: "Failed to create rundown cue" },
      { status: 500 },
    );
  }
}
