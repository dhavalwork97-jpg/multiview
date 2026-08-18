import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { advanceBracket } from "@/lib/bracket-progression";
import { createBroadcastForMatch, endBroadcastForMatch } from "@/lib/youtube";
import { writeAuditLog } from "@/lib/audit";
import { defaultRateLimit } from "@/lib/rate-limit";
import { resolveOutcome, resolveRules, validateScoreEvent } from "@/lib/match-engine";
import type { MatchRules, SideKey } from "@/lib/match-engine/types";

const updateSchema = z.object({
  playerOneScore: z.number().int().min(0).optional(),
  playerTwoScore: z.number().int().min(0).optional(),
  sideScores: z.object({ A: z.number().int().min(0).optional(), B: z.number().int().min(0).optional() }).optional(),
  scoreEvent: z.object({
    sideKey: z.enum(["A", "B"]),
    metric: z.string().min(1),
    value: z.number().int().min(0),
    period: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
  winnerSideKey: z.enum(["A", "B"]).optional(),
  status: z.enum(["QUEUED", "LIVE", "COMPLETED", "DISPUTED"]).optional(),
  winnerId: z.string().optional(),
});

// PATCH /api/matches/:matchId — score-keeper / organizer updates. This is
// the single write path for match state, so every consumer (live grid,
// bracket UI, watch page) only has to trust one source of truth. On
// success it publishes to Redis, which the Socket.IO server fans out to
// the tournament room and the match's own room — see src/server/socket.
export async function PATCH(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.match.findUnique({
    where: { id: matchId },
    include: { sides: { include: { participants: true, scoreEvents: true } }, tournament: { select: { sport: true, competitionRules: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  let actor;
  try {
    actor = (await requireTournamentManage(existing.tournamentId)).user;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = await defaultRateLimit.limit(`match:${actor.id}`);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many match operations — slow down and try again shortly" }, { status: 429 });
  }

  const hasGenericSides = existing.sides.length === 2;
  const hasGenericScoreMutation = Boolean(parsed.data.sideScores || parsed.data.scoreEvent || parsed.data.winnerSideKey);
  if (hasGenericSides && (hasGenericScoreMutation || parsed.data.status === "LIVE" || parsed.data.status === "COMPLETED")) {
    try {
      if (parsed.data.status === "LIVE" && existing.status !== "LIVE") {
        if (!existing.stationId) return NextResponse.json({ error: "Match must be assigned to a station before going LIVE" }, { status: 409 });
        const broadcast = await createBroadcastForMatch(matchId);
        existing.youtubeBroadcastId = broadcast.broadcastId;
        existing.youtubeVideoId = broadcast.videoId;
      }

      const rules = resolveRules(existing.tournament.sport, (existing.rulesSnapshot ?? existing.tournament.competitionRules) as MatchRules | null);
      const sideA = existing.sides.find((s) => s.sideKey === "A");
      const sideB = existing.sides.find((s) => s.sideKey === "B");
      if (!sideA || !sideB) throw new Error("Match must have Side A and Side B");

      if (parsed.data.scoreEvent) validateScoreEvent(parsed.data.scoreEvent, rules);

      const result = await db.$transaction(async (tx) => {
        let scores = { A: sideA.score, B: sideB.score };
        const sidesByKey = { A: sideA, B: sideB };

        if (parsed.data.sideScores) {
          scores = {
            A: parsed.data.sideScores.A ?? scores.A,
            B: parsed.data.sideScores.B ?? scores.B,
          };
          await tx.matchSide.update({ where: { id: sideA.id }, data: { score: scores.A } });
          await tx.matchSide.update({ where: { id: sideB.id }, data: { score: scores.B } });
        }

        if (parsed.data.scoreEvent) {
          const side = sidesByKey[parsed.data.scoreEvent.sideKey];
          const nextSequence = await tx.matchScoreEvent.count({ where: { matchId } }) + 1;
          await tx.matchScoreEvent.create({
            data: {
              matchId,
              sideId: side.id,
              sequence: nextSequence,
              metric: parsed.data.scoreEvent.metric,
              value: parsed.data.scoreEvent.value,
              period: parsed.data.scoreEvent.period,
              metadata: parsed.data.scoreEvent.metadata as any,
            },
          });
          scores = { ...scores, [parsed.data.scoreEvent.sideKey]: scores[parsed.data.scoreEvent.sideKey] + parsed.data.scoreEvent.value };
          await tx.matchSide.update({ where: { id: side.id }, data: { score: scores[parsed.data.scoreEvent.sideKey] } });
        }

        const refreshedEvents = await tx.matchScoreEvent.findMany({ where: { matchId }, orderBy: { sequence: "asc" } });
        const outcome = resolveOutcome(
          { key: "A", score: scores.A, events: refreshedEvents.filter((e) => e.sideId === sideA.id).map((e) => ({ sideKey: "A" as SideKey, metric: e.metric, value: e.value, period: e.period ?? undefined, metadata: (e.metadata ?? undefined) as Record<string, unknown> | undefined, sequence: e.sequence })) },
          { key: "B", score: scores.B, events: refreshedEvents.filter((e) => e.sideId === sideB.id).map((e) => ({ sideKey: "B" as SideKey, metric: e.metric, value: e.value, period: e.period ?? undefined, metadata: (e.metadata ?? undefined) as Record<string, unknown> | undefined, sequence: e.sequence })) },
          rules,
        );

        const winnerSideKey = parsed.data.winnerSideKey ?? outcome.winnerSideKey;
        const winnerSideId = winnerSideKey ? sidesByKey[winnerSideKey].id : null;
        const winnerPlayerId = winnerSideKey ? sidesByKey[winnerSideKey].participants.find((participant) => participant.playerId)?.playerId ?? null : null;
        const completed = parsed.data.status === "COMPLETED";
        if (completed && !winnerSideKey) {
          throw new Error("Cannot complete a tied generic match without winnerSideKey or a score that produces a winner");
        }

        const updated = await tx.match.update({
          where: { id: matchId },
          data: {
            ...(parsed.data.status ? { status: parsed.data.status } : {}),
            ...(parsed.data.status === "LIVE" ? { startedAt: existing.startedAt ?? new Date(), youtubeBroadcastId: existing.youtubeBroadcastId, youtubeVideoId: existing.youtubeVideoId } : {}),
            ...(completed ? { endedAt: existing.endedAt ?? new Date(), winnerSideId, winnerId: winnerPlayerId, youtubeBroadcastId: existing.youtubeBroadcastId, youtubeVideoId: existing.youtubeVideoId } : winnerSideKey ? { winnerSideId } : {}),
            // Legacy score projection remains synchronized for clients that
            // still render playerOne/playerTwo fields.
            playerOneScore: scores.A,
            playerTwoScore: scores.B,
          },
          include: { sides: { include: { participants: true, scoreEvents: true } } },
        });
        return { updated, winnerSideKey, outcome };
      });

      if (result.updated.status === "COMPLETED") {
        try {
          await endBroadcastForMatch(matchId);
        } catch (error) {
          console.error("[youtube broadcast] generic match end failed", error);
          return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to end YouTube broadcast" }, { status: 503 });
        }
        if (result.updated.stationId) {
          await db.station.update({ where: { id: result.updated.stationId }, data: { status: "IDLE", lastHeartbeatAt: new Date() } });
        }

        if (result.updated.bracketId && result.updated.winnerSideId) {
          const advanced = await db.$transaction((tx) => advanceBracket(tx, {
            ...result.updated,
            playerOneId: existing.playerOneId,
            playerTwoId: existing.playerTwoId,
            sides: existing.sides,
          }));
          for (const downstream of advanced) {
            await publishEvent({
              type: "bracket:advanced",
              tournamentId: result.updated.tournamentId,
              bracketId: result.updated.bracketId,
              matchId: downstream.id,
            });
            const nextMatch = await db.match.findUnique({ where: { id: downstream.id } });
            if (nextMatch) {
              await publishEvent({
                type: "match:updated",
                tournamentId: nextMatch.tournamentId,
                matchId: nextMatch.id,
                status: nextMatch.status,
                playerOneScore: nextMatch.playerOneScore,
                playerTwoScore: nextMatch.playerTwoScore,
                winnerId: nextMatch.winnerId,
                winnerSideId: nextMatch.winnerSideId,
                stationId: nextMatch.stationId,
              });
            }
          }
        }

        const remaining = await db.match.count({
          where: { tournamentId: result.updated.tournamentId, status: { in: ["QUEUED", "LIVE"] } },
        });
        if (remaining === 0) {
          await db.tournament.updateMany({
            where: { id: result.updated.tournamentId, status: { in: ["LIVE", "SCHEDULED"] } },
            data: { status: "COMPLETED", endDate: new Date() },
          });
          await publishEvent({ type: "tournament:completed", tournamentId: result.updated.tournamentId });
        }
      }

      await publishEvent({
        type: "match:updated",
        tournamentId: result.updated.tournamentId,
        matchId: result.updated.id,
        status: result.updated.status,
        playerOneScore: result.updated.playerOneScore,
        playerTwoScore: result.updated.playerTwoScore,
        winnerId: result.updated.winnerId,
        winnerSideId: result.updated.winnerSideId,
        sideScores: { A: result.updated.playerOneScore, B: result.updated.playerTwoScore },
        stationId: result.updated.stationId,
      });
      return NextResponse.json({ match: result.updated, engine: { winnerSideKey: result.winnerSideKey, outcome: result.outcome } });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update generic match" }, { status: 400 });
    }
  }

  // Idempotent lifecycle rules: retries from the UI, mobile networks, or
  // operators double-clicking must never replay a transition or create a
  // second stream session.
  if (parsed.data.status === existing.status && parsed.data.status !== "COMPLETED") {
    const updatedSame = await db.match.update({ where: { id: matchId }, data: parsed.data });
    return NextResponse.json({ match: updatedSame, idempotent: true });
  }
  if (parsed.data.status === "LIVE" && !["QUEUED", "DISPUTED"].includes(existing.status)) {
    return NextResponse.json({ error: `Cannot start a match from ${existing.status}` }, { status: 409 });
  }
  if (parsed.data.status === "COMPLETED" && existing.status === "COMPLETED") {
    return NextResponse.json({ match: existing, idempotent: true });
  }
  if (parsed.data.status === "QUEUED" && existing.status !== "QUEUED") {
    return NextResponse.json({ error: `Cannot move ${existing.status} match back to QUEUED` }, { status: 409 });
  }

  const data = { ...parsed.data } as typeof parsed.data & {
    startedAt?: Date;
    endedAt?: Date;
    youtubeBroadcastId?: string;
    youtubeVideoId?: string;
  };

  // Timestamp transitions automatically so callers don't have to remember
  // to set them — a match going LIVE for the first time gets startedAt,
  // one going COMPLETED gets endedAt.
  // Prepare YouTube BEFORE publishing LIVE. This makes Start idempotent and
  // prevents a match from becoming visible as LIVE when no broadcast exists.
  //
  // Important: do not use the match's old youtubeBroadcastId as the decision
  // here. Match A and Match B on one physical station intentionally share the
  // station session, while a match may also retain historical IDs after it
  // completes. createBroadcastForMatch() is the authoritative station-scoped
  // reuse/provisioning path.
  if (parsed.data.status === "LIVE" && existing.status !== "LIVE") {
    if (existing.status === "COMPLETED") {
      return NextResponse.json({ error: "A completed match cannot be started again. Create or schedule a new match instead." }, { status: 409 });
    }
    if (!existing.stationId) return NextResponse.json({ error: "Match must be assigned to a station before going LIVE" }, { status: 409 });
    try {
      const broadcast = await createBroadcastForMatch(matchId);
      data.status = "LIVE";
      data.startedAt = existing.startedAt ?? new Date();
      data.youtubeBroadcastId = broadcast.broadcastId;
      data.youtubeVideoId = broadcast.videoId;
    } catch (error) {
      console.error("[youtube broadcast] failed to create broadcast", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to prepare YouTube Live" }, { status: 503 });
    }
  }

  if (parsed.data.status === "COMPLETED") {
    if (!existing.playerOneId || !existing.playerTwoId) {
      return NextResponse.json({ error: "Generic matches must be completed with sideScores or winnerSideKey" }, { status: 409 });
    }
    const finalPlayerOneScore = parsed.data.playerOneScore ?? existing.playerOneScore;
    const finalPlayerTwoScore = parsed.data.playerTwoScore ?? existing.playerTwoScore;
    const suppliedWinnerId = parsed.data.winnerId;
    const inferredWinnerId =
      suppliedWinnerId ??
      (finalPlayerOneScore > finalPlayerTwoScore
        ? existing.playerOneId
        : finalPlayerTwoScore > finalPlayerOneScore
          ? existing.playerTwoId
          : undefined);

    if (suppliedWinnerId && suppliedWinnerId !== existing.playerOneId && suppliedWinnerId !== existing.playerTwoId) {
      return NextResponse.json({ error: "winnerId must belong to one of the two players in this match" }, { status: 400 });
    }

    if (!inferredWinnerId) {
      return NextResponse.json(
        { error: "Cannot complete a tied match without winnerId. Set the final score or explicitly select the winner." },
        { status: 409 }
      );
    }

    data.winnerId = inferredWinnerId;

    try {
      await endBroadcastForMatch(matchId);
    } catch (error) {
      console.error("[youtube broadcast] failed to end broadcast", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to end YouTube broadcast" }, { status: 503 });
    }
    data.endedAt = existing.endedAt ?? new Date();
  }

  const updated = await db.match.update({ where: { id: matchId }, data });

  if (updated.status === "COMPLETED" && updated.stationId) {
    const station = await db.station.update({
      where: { id: updated.stationId },
      data: { status: "IDLE", lastHeartbeatAt: new Date() },
      select: { status: true, lastHeartbeatAt: true },
    });
    await publishEvent({
      type: "station:status",
      tournamentId: updated.tournamentId,
      stationId: updated.stationId,
      status: station.status,
      lastHeartbeatAt: station.lastHeartbeatAt?.toISOString() ?? null,
    });
  }

  await publishEvent({
    type: "match:updated",
    tournamentId: updated.tournamentId,
    matchId: updated.id,
    status: updated.status,
    playerOneScore: updated.playerOneScore,
    playerTwoScore: updated.playerTwoScore,
    winnerId: updated.winnerId,
    stationId: updated.stationId,
  });

  if (updated.status === "LIVE" && updated.stationId) {
    const station = await db.station.findUnique({ where: { id: updated.stationId }, select: { status: true, lastHeartbeatAt: true } });
    if (station) {
      await publishEvent({
        type: "station:status",
        tournamentId: updated.tournamentId,
        stationId: updated.stationId,
        status: station.status,
        lastHeartbeatAt: station.lastHeartbeatAt?.toISOString() ?? null,
      });
    }
  }

  // A match going COMPLETED with a winner is the trigger for bracket
  // progression — see src/lib/bracket-progression.ts for why this is the
  // single write path for that (score-keeper/organizer PATCH is already
  // the single write path for match state generally).
  if (updated.status === "COMPLETED" && updated.winnerId && updated.bracketId && existing.sides.length < 2) {
    const advanced = await db.$transaction((tx) => advanceBracket(tx, {
      ...updated,
      playerOneId: existing.playerOneId,
      playerTwoId: existing.playerTwoId,
      sides: existing.sides,
    }));
    for (const downstream of advanced) {
      await publishEvent({
        type: "bracket:advanced",
        tournamentId: updated.tournamentId,
        bracketId: updated.bracketId,
        matchId: downstream.id,
      });
    }
  }

  if (updated.status === "COMPLETED") {
    const remaining = await db.match.count({
      where: { tournamentId: updated.tournamentId, status: { in: ["QUEUED", "LIVE"] } },
    });
    if (remaining === 0) {
      await db.tournament.updateMany({
        where: { id: updated.tournamentId, status: { in: ["LIVE", "SCHEDULED"] } },
        data: { status: "COMPLETED", endDate: new Date() },
      });
      await publishEvent({ type: "tournament:completed", tournamentId: updated.tournamentId });
    }
  }

  const organization = await db.tournament.findUnique({ where: { id: updated.tournamentId }, select: { organizationId: true } });
  if (organization) {
    const notificationType = updated.status === "LIVE" ? "MATCH_LIVE" : updated.status === "COMPLETED" ? "MATCH_COMPLETED" : "TOURNAMENT_UPDATE";
    await db.notification.create({ data: { organizationId: organization.organizationId, tournamentId: updated.tournamentId, type: notificationType, title: updated.status === "LIVE" ? "Match is live" : updated.status === "COMPLETED" ? "Match completed" : "Match updated", message: `Match ${updated.id.slice(0, 8)} is now ${updated.status.toLowerCase()}.`, href: `/watch/${updated.id}` } });
  }

  await writeAuditLog({
    tournamentId: updated.tournamentId,
    actorUserId: actor.id,
    action: `MATCH_${updated.status}`,
    entityType: "match",
    entityId: updated.id,
    metadata: {
      stationId: updated.stationId,
      playerOneScore: updated.playerOneScore,
      playerTwoScore: updated.playerTwoScore,
      winnerId: updated.winnerId,
      youtubeVideoId: updated.youtubeVideoId,
    },
  });

  return NextResponse.json({ match: updated });
}
