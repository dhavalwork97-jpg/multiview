import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { createBroadcastDestination, type BroadcastDestination, type BroadcastDestinationInput } from "@/lib/broadcast/destinations";

const DESTINATIONS_KEY = "destinations";

type StoredOverlay = Record<string, unknown> & {
  broadcastDestinations?: BroadcastDestination[];
};

function readDestinations(overlay: unknown): BroadcastDestination[] {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return [];
  const value = (overlay as StoredOverlay).broadcastDestinations;
  return Array.isArray(value) ? value as BroadcastDestination[] : [];
}

async function loadTournament(tournamentId: string) {
  return db.broadcastState.findUnique({
    where: { tournamentId },
    select: { overlay: true },
  });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournamentId = new URL(request.url).searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });

  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  const state = await loadTournament(tournamentId);
  return NextResponse.json({ destinations: readDestinations(state?.overlay) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<BroadcastDestinationInput> & { tournamentId?: string };
  if (!body.tournamentId || !body.provider || !body.label) {
    return NextResponse.json({ error: "tournamentId, provider and label are required" }, { status: 400 });
  }

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  if (!["youtube", "twitch", "rtmp"].includes(body.provider)) {
    return NextResponse.json({ error: "Invalid broadcast provider" }, { status: 400 });
  }

  let destination: BroadcastDestination;
  try {
    destination = createBroadcastDestination(crypto.randomUUID(), {
      provider: body.provider,
      label: body.label,
      channelName: body.channelName,
      streamUrl: body.streamUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid destination" }, { status: 400 });
  }

  const state = await loadTournament(body.tournamentId);
  const previousOverlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay)
    ? state.overlay as StoredOverlay
    : {};
  const destinations = [...readDestinations(previousOverlay), destination];
  const overlay = { ...previousOverlay, broadcastDestinations: destinations };

  await db.broadcastState.upsert({
    where: { tournamentId: body.tournamentId },
    create: { tournamentId: body.tournamentId, scene: "OFFLINE", overlay: JSON.parse(JSON.stringify(overlay)) },
    update: { overlay: JSON.parse(JSON.stringify(overlay)) },
  });

  return NextResponse.json({ ok: true, destination, destinations }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { tournamentId?: string; destinationId?: string };
  if (!body.tournamentId || !body.destinationId) return NextResponse.json({ error: "tournamentId and destinationId are required" }, { status: 400 });

  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });

  const state = await loadTournament(body.tournamentId);
  const previousOverlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay)
    ? state.overlay as StoredOverlay
    : {};
  const destinations = readDestinations(previousOverlay).filter((item) => item.id !== body.destinationId);
  const overlay = { ...previousOverlay, broadcastDestinations: destinations };

  await db.broadcastState.upsert({
    where: { tournamentId: body.tournamentId },
    create: { tournamentId: body.tournamentId, scene: "OFFLINE", overlay: JSON.parse(JSON.stringify(overlay)) },
    update: { overlay: JSON.parse(JSON.stringify(overlay)) },
  });

  return NextResponse.json({ ok: true, destinations });
}
