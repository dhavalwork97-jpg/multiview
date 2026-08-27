import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  requireTournamentManage,
  requireTournamentView,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { publishEvent } from "@/lib/events";

const sceneSchema = z.enum([
  "OFFLINE",
  "WAITING",
  "MATCH",
  "BREAK",
  "INTERMISSION",
  "RESULTS",
]);

const overlaySchema = z.record(z.string(), z.unknown());

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SET_SCENE"),
    scene: sceneSchema,
  }),

  z.object({
    type: z.literal("SELECT_STATION"),
    stationId: z.string().min(1),
  }),

  z.object({
    type: z.literal("SELECT_MATCH"),
    matchId: z.string().min(1),
  }),

  z.object({
    type: z.literal("UPDATE_OVERLAY"),
    overlay: overlaySchema,
  }),

  z.object({
    type: z.literal("CLEAR_SELECTION"),
  }),
]);

type RouteContext = {
  params: Promise<{ tournamentId: string }>;
};

function serializeState(state: {
  id: string;
  tournamentId: string;
  scene: string;
  stationId: string | null;
  matchId: string | null;
  overlay: unknown;
  updatedAt: Date;
  createdAt: Date;
}) {
  return {
    ...state,
    overlay:
      state.overlay &&
      typeof state.overlay === "object" &&
      !Array.isArray(state.overlay)
        ? (state.overlay as Record<string, unknown>)
        : null,
  };
}

// GET /api/tournaments/:tournamentId/broadcast
//
// Returns the persistent broadcast director state. The state is deliberately
// separate from OBS so dashboards, overlays and future broadcast agents all
// have one stable source of truth.
export async function GET(
  _req: Request,
  { params }: RouteContext,
) {
  const { tournamentId } = await params;

  try {
    await requireTournamentView(tournamentId);
  } catch {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  const state = await db.broadcastState.findUnique({
    where: { tournamentId },
    include: {
      station: {
        select: {
          id: true,
          label: true,
          status: true,
        },
      },
      match: {
        select: {
          id: true,
          round: true,
          status: true,
          playerOne: {
            select: {
              id: true,
              gamertag: true,
            },
          },
          playerTwo: {
            select: {
              id: true,
              gamertag: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    state: state
      ? serializeState(state)
      : {
          tournamentId,
          scene: "OFFLINE",
          stationId: null,
          matchId: null,
          overlay: null,
          station: null,
          match: null,
        },
  });
}

// POST /api/tournaments/:tournamentId/broadcast
//
// Records and applies a broadcast director command. This endpoint does not
// talk to OBS directly; persistence is the source of truth and realtime
// publication lets the UI and future OBS bridge react independently.
export async function POST(
  req: Request,
  { params }: RouteContext,
) {
  const { tournamentId } = await params;

  let access;
  try {
    access = await requireTournamentManage(tournamentId);
  } catch {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = commandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid broadcast command",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const command = parsed.data;

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  // Validate foreign resources before changing state. This prevents an
  // operator from accidentally selecting a station or match from another
  // tournament by ID.
  if (command.type === "SELECT_STATION") {
    const station = await db.station.findFirst({
      where: {
        id: command.stationId,
        tournamentId,
      },
      select: { id: true },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Station not found for this tournament" },
        { status: 404 },
      );
    }
  }

  if (command.type === "SELECT_MATCH") {
    const match = await db.match.findFirst({
      where: {
        id: command.matchId,
        tournamentId,
      },
      select: { id: true },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found for this tournament" },
        { status: 404 },
      );
    }
  }

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.broadcastState.findUnique({
      where: { tournamentId },
    });

    const currentOverlay =
      existing?.overlay &&
      typeof existing.overlay === "object" &&
      !Array.isArray(existing.overlay)
        ? (existing.overlay as Record<string, unknown>)
        : {};

    const data: {
      scene?: z.infer<typeof sceneSchema>;
      stationId?: string | null;
      matchId?: string | null;
      overlay?: Record<string, unknown>;
    } = {};

    switch (command.type) {
      case "SET_SCENE":
        data.scene = command.scene;
        break;

      case "SELECT_STATION":
        data.stationId = command.stationId;
        break;

      case "SELECT_MATCH":
        data.matchId = command.matchId;
        break;

      case "UPDATE_OVERLAY":
        // PATCH-like semantics are useful for independent overlay controls:
        // updating a sponsor field should not erase the score field.
        data.overlay = {
          ...currentOverlay,
          ...command.overlay,
        };
        break;

      case "CLEAR_SELECTION":
        data.stationId = null;
        data.matchId = null;
        break;
    }

const overlay =
      data.overlay === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(data.overlay)) as Prisma.InputJsonValue);

    const createData: Prisma.BroadcastStateUncheckedCreateInput = {
      tournamentId,
      scene: data.scene ?? "OFFLINE",
      stationId: data.stationId ?? null,
      matchId: data.matchId ?? null,
      ...(overlay !== undefined ? { overlay } : {}),
    };

    const updateData: Prisma.BroadcastStateUncheckedUpdateInput = {
      ...(data.scene !== undefined ? { scene: data.scene } : {}),
      ...(data.stationId !== undefined ? { stationId: data.stationId } : {}),
      ...(data.matchId !== undefined ? { matchId: data.matchId } : {}),
      ...(overlay !== undefined ? { overlay } : {}),
    };

    const state = await tx.broadcastState.upsert({
      where: { tournamentId },
      create: createData,
      update: updateData,
    });

    const commandRecord = await tx.broadcastCommand.create({
      data: {
        tournamentId,
        actorUserId: access.user.id,
        type: command.type,
        payload: JSON.parse(JSON.stringify(command)),
      },
    });

    return {
      state,
      commandRecord,
    };
  });

  const serializedState = serializeState(result.state);

  await writeAuditLog({
    tournamentId,
    actorUserId: access.user.id,
    action: `BROADCAST_${command.type}`,
    entityType: "broadcast",
    entityId: result.state.id,
    metadata: {
      commandId: result.commandRecord.id,
      command,
      scene: serializedState.scene,
      stationId: serializedState.stationId,
      matchId: serializedState.matchId,
    },
  });

  await publishEvent({
    type: "broadcast:updated",
    tournamentId,
    scene: serializedState.scene,
    stationId: serializedState.stationId,
    matchId: serializedState.matchId,
    overlay: serializedState.overlay,
    commandType: command.type,
  });

  return NextResponse.json({
    state: serializedState,
    command: {
      id: result.commandRecord.id,
      type: result.commandRecord.type,
      createdAt: result.commandRecord.createdAt,
    },
  });
}