import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { canTransition, canReorder } from "@/lib/rundown-policy";

const schema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    action: z.enum(["TAKE", "COMPLETE", "SKIP", "MOVE_UP", "MOVE_DOWN"]).optional(),
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
    matchId: z.string().min(1).nullable().optional(),
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

  if (input.matchId !== undefined) {
    if (cue.cueType !== "MATCH") {
      return NextResponse.json({ error: "Only MATCH cues can reference a match" }, { status: 400 });
    }
    if (!input.matchId) {
      return NextResponse.json({ error: "A match cue requires a tournament match" }, { status: 400 });
    }
    const match = await db.match.findFirst({ where: { id: input.matchId, tournamentId }, select: { id: true } });
    if (!match) return NextResponse.json({ error: "Match not found in this tournament" }, { status: 400 });
  }

  const updateData: Prisma.BroadcastCueUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.durationSec !== undefined
      ? { durationSec: input.durationSec }
      : {}),
    ...(input.payload !== undefined || input.matchId !== undefined
      ? {
          payload:
            input.payload === null
              ? Prisma.JsonNull
              : ({
                  ...((input.payload ?? (cue.payload as Record<string, unknown> | null) ?? {}) as Record<string, unknown>),
                  ...(input.matchId !== undefined ? { matchId: input.matchId } : {}),
                } as Prisma.InputJsonValue),
        }
      : {}),
  };

  if (input.action) {
    const now = new Date();

    if (input.action === "MOVE_UP" || input.action === "MOVE_DOWN") {
      if (!canReorder(cue.status)) {
        return NextResponse.json({ error: "The live cue cannot be reordered" }, { status: 409 });
      }

      const ordered = await db.broadcastCue.findMany({
        where: { tournamentId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, position: true },
      });
      const index = ordered.findIndex((item) => item.id === cueId);
      const targetIndex = input.action === "MOVE_UP" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return NextResponse.json({ cue });
      }

      const neighbor = ordered[targetIndex];
      if (!neighbor) return NextResponse.json({ cue });
      if (ordered.some((item) => item.id === neighbor.id && item.id !== cueId)) {
        const [updated] = await db.$transaction([
          db.broadcastCue.update({ where: { id: cueId }, data: { position: neighbor.position } }),
          db.broadcastCue.update({ where: { id: neighbor.id }, data: { position: cue.position } }),
        ]);
        return NextResponse.json({ cue: updated });
      }
    }

    if (input.action === "TAKE") {
      if (!canTransition(cue.status, "TAKE")) {
        return NextResponse.json({ error: "Only pending cues can be taken live" }, { status: 409 });
      }

      const [, updated] = await db.$transaction([
        db.broadcastCue.updateMany({
          where: { tournamentId, status: "LIVE", id: { not: cueId } },
          data: { status: "COMPLETED", completedAt: now },
        }),
        db.broadcastCue.update({
          where: { id: cueId },
          data: { ...updateData, status: "LIVE", startedAt: now, completedAt: null },
        }),
      ]);
      return NextResponse.json({ cue: updated });
    }

    if (input.action === "COMPLETE") {
      if (!canTransition(cue.status, "COMPLETE")) {
        return NextResponse.json({ error: "Only the live cue can be completed" }, { status: 409 });
      }
      const updated = await db.broadcastCue.update({
        where: { id: cueId },
        data: { ...updateData, status: "COMPLETED", completedAt: now },
      });
      return NextResponse.json({ cue: updated });
    }

    if (!canTransition(cue.status, "SKIP")) {
      return NextResponse.json({ error: "Only pending cues can be skipped" }, { status: 409 });
    }
    const updated = await db.broadcastCue.update({
      where: { id: cueId },
      data: { ...updateData, status: "SKIPPED", completedAt: now },
    });
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

  const cue = await db.broadcastCue.findFirst({ where: { id: cueId, tournamentId } });
  if (!cue) {
    return NextResponse.json({ error: "Cue not found" }, { status: 404 });
  }
  if (cue.status === "LIVE") {
    return NextResponse.json({ error: "Complete the live cue before deleting it" }, { status: 409 });
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