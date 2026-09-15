import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { encryptBroadcastSecret } from "@/lib/broadcast/managed-kms";
import { createBroadcastDestination, type BroadcastDestination, type BroadcastDestinationInput } from "@/lib/broadcast/destinations";

type StoredDestination = BroadcastDestination & { encryptedStreamKey?: string | null };
type StoredOverlay = Record<string, unknown> & { broadcastDestinations?: StoredDestination[] };

function readDestinations(overlay: unknown): StoredDestination[] {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return [];
  const value = (overlay as StoredOverlay).broadcastDestinations;
  return Array.isArray(value) ? value as StoredDestination[] : [];
}
function publicDestination(destination: StoredDestination): BroadcastDestination { const { encryptedStreamKey: _encryptedStreamKey, ...safe } = destination; return safe; }
function publicDestinations(destinations: StoredDestination[]) { return destinations.map(publicDestination); }
async function loadTournament(tournamentId: string) { return db.broadcastState.findUnique({ where: { tournamentId }, select: { overlay: true } }); }

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tournamentId = new URL(request.url).searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required", code: "MISSING_TOURNAMENT_ID" }, { status: 400 });
  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });
  const state = await loadTournament(tournamentId);
  return NextResponse.json({ destinations: publicDestinations(readDestinations(state?.overlay)) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Partial<BroadcastDestinationInput> & { tournamentId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON.", code: "INVALID_JSON" }, { status: 400 }); }
  if (!body.tournamentId || !body.provider || !body.label) {
    const fieldErrors = { ...(body.tournamentId ? {} : { tournamentId: "Tournament is required." }), ...(body.provider ? {} : { provider: "Destination type is required." }), ...(body.label ? {} : { label: "A destination label is required." }) };
    return NextResponse.json({ error: Object.values(fieldErrors)[0] ?? "Required destination fields are missing.", code: "MISSING_REQUIRED_FIELDS", fieldErrors }, { status: 400 });
  }
  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });
  if (!["youtube", "twitch", "rtmp"].includes(body.provider)) return NextResponse.json({ error: "Invalid broadcast provider", code: "INVALID_PROVIDER", fieldErrors: { provider: "Choose a supported destination type." } }, { status: 400 });

  let destination: StoredDestination;
  try {
    destination = createBroadcastDestination(crypto.randomUUID(), { provider: body.provider, label: body.label, channelName: body.channelName, streamUrl: body.streamUrl, streamKey: body.streamKey });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid destination";
    const fieldErrors = { ...(body.provider === "rtmp" && !body.streamUrl?.trim() ? { streamUrl: "Enter the RTMP server / ingest URL." } : {}), ...(body.provider === "rtmp" && !body.streamKey?.trim() ? { streamKey: "Enter the stream key provided by your streaming service." } : {}), ...(typeof body.label === "string" && !body.label.trim() ? { label: "Enter a destination label." } : {}) };
    return NextResponse.json({ error: message, code: "INVALID_DESTINATION", fieldErrors }, { status: 400 });
  }

  const vercelOidcToken = request.headers.get("x-vercel-oidc-token");
  if (!vercelOidcToken) return NextResponse.json({ error: "Managed broadcast secret storage is not configured for this deployment.", code: "MANAGED_KMS_UNAVAILABLE" }, { status: 503 });
  try {
    if (body.provider === "rtmp" && body.streamKey?.trim()) destination.encryptedStreamKey = await encryptBroadcastSecret(body.streamKey.trim(), vercelOidcToken);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not securely store the stream key", code: "MANAGED_KMS_ERROR" }, { status: 503 });
  }

  const state = await loadTournament(body.tournamentId);
  const previousOverlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as StoredOverlay : {};
  const destinations = [...readDestinations(previousOverlay), destination];
  const overlay = { ...previousOverlay, broadcastDestinations: destinations };
  await db.broadcastState.upsert({ where: { tournamentId: body.tournamentId }, create: { tournamentId: body.tournamentId, scene: "OFFLINE", overlay: JSON.parse(JSON.stringify(overlay)) }, update: { overlay: JSON.parse(JSON.stringify(overlay)) } });
  return NextResponse.json({ ok: true, destination: publicDestination(destination), destinations: publicDestinations(destinations) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { tournamentId?: string; destinationId?: string };
  if (!body.tournamentId || !body.destinationId) return NextResponse.json({ error: "tournamentId and destinationId are required" }, { status: 400 });
  const authorization = await authorizeBroadcastOperator(userId, body.tournamentId);
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status });
  const state = await loadTournament(body.tournamentId);
  const previousOverlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as StoredOverlay : {};
  const destinations = readDestinations(previousOverlay).filter((item) => item.id !== body.destinationId);
  const overlay = { ...previousOverlay, broadcastDestinations: destinations };
  await db.broadcastState.upsert({ where: { tournamentId: body.tournamentId }, create: { tournamentId: body.tournamentId, scene: "OFFLINE", overlay: JSON.parse(JSON.stringify(overlay)) }, update: { overlay: JSON.parse(JSON.stringify(overlay)) } });
  return NextResponse.json({ ok: true, destinations: publicDestinations(destinations) });
}
