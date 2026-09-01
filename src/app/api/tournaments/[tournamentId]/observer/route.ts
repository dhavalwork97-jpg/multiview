import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage, requireTournamentView } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { isBattleRoyaleMatch, rankObserverRecommendations } from "@/lib/observer-assistant";

const teamSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  alive: z.number().int().min(0).nullable().optional(),
  kills: z.number().int().min(0).optional(),
  points: z.number().optional(),
});
const fightSchema = z.object({
  id: z.string().min(1).max(100),
  teamKeys: z.array(z.string().min(1)).min(1).max(8),
  intensity: z.number().min(0).max(100),
  label: z.string().max(160).optional(),
  updatedAt: z.string().optional(),
});
const bodySchema = z.object({
  matchId: z.string().min(1),
  mode: z.enum(["FREE", "TEAM"]),
  currentTeamKey: z.string().nullable().optional(),
  teams: z.array(teamSchema).max(100),
  fights: z.array(fightSchema).max(100),
});

type Params = { params: Promise<{ tournamentId: string }> };

function readObserver(overlay: unknown) {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return null;
  const value = (overlay as Record<string, unknown>).observer;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

export async function GET(_req: Request, { params }: Params) {
  const { tournamentId } = await params;
  try { await requireTournamentView(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const state = await db.broadcastState.findUnique({ where: { tournamentId }, select: { matchId: true, overlay: true } });
  if (!state?.matchId) return NextResponse.json({ matchId: null, observer: null, recommendations: [], isBattleRoyale: false });

  const match = await db.match.findFirst({
    where: { id: state.matchId, tournamentId },
    select: {
      id: true,
      scoringAdapter: true,
      status: true,
      round: true,
      stage: { select: { id: true, name: true, kind: true, orderIndex: true, status: true } },
      sides: {
        select: {
          sideKey: true,
          label: true,
          score: true,
          participants: { select: { displayName: true, player: { select: { gamertag: true } }, team: { select: { name: true } } } },
          scoreEvents: { orderBy: { createdAt: "desc" }, take: 8, select: { metric: true, value: true, createdAt: true } },
        },
      },
    },
  });
  if (!match) return NextResponse.json({ matchId: state.matchId, observer: null, recommendations: [], isBattleRoyale: false });

  const existing = readObserver(state.overlay);
  const teams = match.sides.map((side) => {
    const participant = side.participants[0];
    const label = participant?.team?.name ?? participant?.player?.gamertag ?? participant?.displayName ?? side.label ?? side.sideKey;
    const kills = side.scoreEvents.filter((event) => /kill|elimination/i.test(event.metric)).reduce((sum, event) => sum + Math.max(0, event.value), 0);
    return { key: side.sideKey, label, kills, points: side.score };
  });
  const autoFights = match.sides.flatMap((side) => {
    const recent = side.scoreEvents.find((event) => /kill|knock|elimination|fight|damage/i.test(event.metric));
    if (!recent || Date.now() - recent.createdAt.getTime() > 90_000) return [];
    return [{ id: `auto-${side.sideKey}`, teamKeys: [side.sideKey], intensity: /knock|fight/i.test(recent.metric) ? 90 : 70, label: `${teams.find((team) => team.key === side.sideKey)?.label ?? side.sideKey} recent combat`, updatedAt: recent.createdAt.toISOString() }];
  });
  const observer = existing && typeof existing === "object"
    ? existing
    : { matchId: match.id, mode: "FREE", currentTeamKey: null, teams, fights: autoFights, generatedAt: new Date().toISOString() };
  const normalized = { ...observer, teams: Array.isArray((observer as any).teams) && (observer as any).teams.length ? (observer as any).teams : teams, fights: Array.isArray((observer as any).fights) ? (observer as any).fights : autoFights };
  const recommendations = rankObserverRecommendations(normalized as Parameters<typeof rankObserverRecommendations>[0]);
  return NextResponse.json({
    matchId: state.matchId,
    observer: normalized,
    recommendations,
    isBattleRoyale: isBattleRoyaleMatch(match),
    matchState: { status: match.status, round: match.round, stage: match.stage },
  });
}

export async function POST(req: Request, { params }: Params) {
  const { tournamentId } = await params;
  let access;
  try { access = await requireTournamentManage(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid observer state", details: parsed.error.flatten() }, { status: 400 });

  const match = await db.match.findFirst({
    where: { id: parsed.data.matchId, tournamentId },
    select: { id: true, status: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found for this tournament" }, { status: 404 });

  const current = await db.broadcastState.findUnique({ where: { tournamentId }, select: { overlay: true } });
  const overlay = current?.overlay && typeof current.overlay === "object" && !Array.isArray(current.overlay)
    ? current.overlay as Record<string, unknown> : {};
  const observer = {
    ...parsed.data,
    currentTeamKey: parsed.data.currentTeamKey ?? null,
    generatedAt: new Date().toISOString(),
  };
  const nextOverlay = JSON.parse(JSON.stringify({ ...overlay, observer }));

  const state = await db.broadcastState.upsert({
    where: { tournamentId },
    create: { tournamentId, scene: "MATCH", matchId: parsed.data.matchId, overlay: nextOverlay },
    update: { matchId: parsed.data.matchId, overlay: nextOverlay },
  });
  const recommendations = rankObserverRecommendations(observer);
  await publishEvent({ type: "broadcast:updated", tournamentId, scene: state.scene, stationId: state.stationId, matchId: state.matchId, overlay: nextOverlay, commandType: "OBSERVER_UPDATE" });
  await publishEvent({ type: "competition:updated", tournamentId, reason: "LIVE_STATE_UPDATED" });
  return NextResponse.json({ observer, recommendations, updatedAt: state.updatedAt, actorUserId: access.user.id });
}
