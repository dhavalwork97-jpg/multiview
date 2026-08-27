import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";

const schema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    status: z
      .enum(["PENDING", "LIVE", "COMPLETED", "SKIPPED"])
      .optional(),
    position: z.number().int().min(0).optional(),
    durationSec: z
      .number()
      .int()
      .positive()
      .max(86400)
      .nullable()
      .optional(),
    payload: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0);

type Ctx = {
  params: Promise<{ tournamentId: string; cueId: string }>;
};

export async function PATCH(req: Request, { params }: Ctx) {
  const { tournamentId, cueId } = await params;

  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(
    await req.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rundown update" },
      { status: 400 },
    );
  }

  const cue = await db.broadcastCue.findFirst({
    where: { id: cueId, tournamentId },
  });

  if (!cue) {
    return NextResponse.json(
      { error: "Cue not found" },
      { status: 404 },
    );
  }

  const input = parsed.data;

  const updateData: Prisma.BroadcastCueUpdateInput = {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.durationSec !== undefined
      ? { durationSec: input.durationSec }
      : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
    ...(input.payload !== undefined
      ? {
          payload:
            input.payload === null
              ? Prisma.JsonNull
              : (input.payload as Prisma.InputJsonValue),
        }
      : {}),
  };

  // Only one cue can be on-air at a time; promoting a cue
  // automatically closes the previous one.
  if (input.status === "LIVE") {
    const [, updated] = await db.$transaction([
      db.broadcastCue.updateMany({
        where: {
          tournamentId,
          status: "LIVE",
          id: { not: cueId },
        },
        data: { status: "COMPLETED" },
      }),
      db.broadcastCue.update({
        where: { id: cueId },
        data: updateData,
      }),
    ]);

    return NextResponse.json({ cue: updated });
  }

  const updated = await db.broadcastCue.update({
    where: { id: cueId },
    data: updateData,
  });

  return NextResponse.json({ cue: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { tournamentId, cueId } = await params;

  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.broadcastCue.deleteMany({
    where: { id: cueId, tournamentId },
  });

  if (!result.count) {
    return NextResponse.json(
      { error: "Cue not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}