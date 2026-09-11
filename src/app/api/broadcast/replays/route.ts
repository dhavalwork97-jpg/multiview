import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { normalizeReplayClip, type ReplayClip } from "@/lib/broadcast/replay";

function clipFromCue(cue: { id: string; payload: unknown }): ReplayClip | null {
  if (!cue.payload || typeof cue.payload !== "object") return null;
  const payload = cue.payload as { kind?: unknown; clip?: Partial<ReplayClip> };
  if (payload.kind !== "replay" || !payload.clip) return null;
  return normalizeReplayClip({ ...payload.clip, id: cue.id });
}

async function authorize(request: Request) {
  const { userId } = await auth();
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const tournamentId = new URL(request.url).searchParams.get("tournamentId");
  if (!tournamentId) return { response: NextResponse.json({ error: "tournamentId is required" }, { status: 400 }) };
  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) {
    return { response: NextResponse.json({ error: authorization.status === 404 ? "Tournament not found" : "Forbidden" }, { status: authorization.status }) };
  }
  return { tournamentId };
}

export async function GET(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;
  const cues = await db.broadcastCue.findMany({ where: { tournamentId: authz.tournamentId }, orderBy: { position: "asc" }, select: { id: true, payload: true } });
  const clips = cues.map(clipFromCue).filter((clip): clip is ReplayClip => clip !== null);
  return NextResponse.json({ clips });
}

export async function POST(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;
  const body = (await request.json()) as { clip?: Partial<ReplayClip> };
  if (!body.clip?.title?.trim()) return NextResponse.json({ error: "clip.title is required" }, { status: 400 });
  const clip = normalizeReplayClip(body.clip);
  const position = await db.broadcastCue.count({ where: { tournamentId: authz.tournamentId } });
  const created = await db.broadcastCue.create({
    data: {
      tournamentId: authz.tournamentId,
      title: clip.title,
      cueType: "CUSTOM",
      position,
      payload: JSON.parse(JSON.stringify({ kind: "replay", clip })),
    },
    select: { id: true, payload: true },
  });
  return NextResponse.json({ clip: clipFromCue(created) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;
  const body = (await request.json()) as { id?: string; clip?: Partial<ReplayClip> };
  if (!body.id || !body.clip) return NextResponse.json({ error: "id and clip are required" }, { status: 400 });
  const existing = await db.broadcastCue.findFirst({ where: { id: body.id, tournamentId: authz.tournamentId } });
  if (!existing) return NextResponse.json({ error: "Replay clip not found" }, { status: 404 });
  const previous = clipFromCue(existing);
  if (!previous) return NextResponse.json({ error: "Replay clip not found" }, { status: 404 });
  const clip = normalizeReplayClip({ ...previous, ...body.clip, id: existing.id });
  const updated = await db.broadcastCue.update({
    where: { id: existing.id },
    data: { title: clip.title, payload: JSON.parse(JSON.stringify({ kind: "replay", clip })) },
    select: { id: true, payload: true },
  });
  return NextResponse.json({ clip: clipFromCue(updated) });
}

export async function DELETE(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = await db.broadcastCue.deleteMany({ where: { id, tournamentId: authz.tournamentId } });
  if (!deleted.count) return NextResponse.json({ error: "Replay clip not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
