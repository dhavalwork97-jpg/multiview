import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { progressMatchTransaction } from "@/lib/progression/progression-engine";
import { resolveCompetitionCompletion } from "@/lib/progression/completion-engine";
import {
  createBroadcastForMatch,
  endBroadcastForMatch,
} from "@/lib/youtube";
import { writeAuditLog } from "@/lib/audit";
import { defaultRateLimit } from "@/lib/rate-limit";
import {
  resolveOutcome,
  resolveRules,
  validateScoreEvent,
} from "@/lib/match-engine";
import type { MatchRules, SideKey } from "@/lib/match-engine/types";

const updateSchema = z.object({
  playerOneScore: z.number().int().min(0).optional(),
  playerTwoScore: z.number().int().min(0).optional(),

  sideScores: z
    .object({
      A: z.number().int().min(0).optional(),
      B: z.number().int().min(0).optional(),
    })
    .optional(),

  scoreEvent: z
    .object({
      sideKey: z.string().min(1).max(20),
      metric: z.string().min(1),
      value: z.number().int().min(0),
      period: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),

  winnerSideKey: z.enum(["A", "B"]).optional(),

  status: z
    .enum(["QUEUED", "LIVE", "COMPLETED", "DISPUTED"])
    .optional(),

  winnerId: z.string().optional(),
});

/**
 * PATCH /api/matches/:matchId
 *
 * Single write path for match state changes.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  const body = await req.json();

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.match.findUnique({
    where: {
      id: matchId,
    },
    include: {
      sides: {
        include: {
          participants: true,
          scoreEvents: true,
        },
      },
      tournament: {
        select: {
          sport: true,
          competitionRules: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Match not found" },
      { status: 404 },
    );
  }

  let actor;

  try {
    actor = (
      await requireTournamentManage(existing.tournamentId)
    ).user;
  } catch {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const limit = await defaultRateLimit.limit(
    `match:${actor.id}`,
  );

  if (!limit.success) {
    return NextResponse.json(
      {
        error:
          "Too many match operations — slow down and try again shortly",
      },
      { status: 429 },
    );
  }

  /*
   * Battle Royale matches use one side per entrant. They are not head-to-head
   * and therefore must not pass through the two-side outcome/progression path.
   */
  if (existing.tournament.sport === "bgmi" || existing.scoringAdapter === "battle_royale") {
    if (parsed.data.winnerSideKey) {
      return NextResponse.json({ error: "Battle Royale matches do not have a single winner side; submit placement/kills/points." }, { status: 400 });
    }
    const scoreEvent = parsed.data.scoreEvent;
    if (scoreEvent) {
      const rules = resolveRules(existing.tournament.sport, { ...(existing.tournament.competitionRules as any ?? {}), scoringAdapter: "battle_royale" });
      validateScoreEvent(scoreEvent, rules);
    }
    try {
      const result = await db.$transaction(async (tx) => {
        const sides = await tx.matchSide.findMany({ where: { matchId }, orderBy: { sideKey: "asc" } });
        const side = scoreEvent ? sides.find((candidate) => candidate.sideKey === scoreEvent.sideKey) : null;
        if (scoreEvent && !side) throw new Error("Invalid Battle Royale participant side");
        if (scoreEvent) {
          const nextSequence = (await tx.matchScoreEvent.count({ where: { matchId } })) + 1;
          await tx.matchScoreEvent.create({ data: { matchId, sideId: side!.id, sequence: nextSequence, metric: scoreEvent.metric, value: scoreEvent.value, period: scoreEvent.period, metadata: scoreEvent.metadata as any } });
        }
        const sideScores = parsed.data.sideScores ?? {};
        for (const candidate of sides) {
          const key = candidate.sideKey === "A" ? "A" : candidate.sideKey === "B" ? "B" : candidate.sideKey;
          const next = (sideScores as Record<string, number | undefined>)[key];
          if (typeof next === "number") await tx.matchSide.update({ where: { id: candidate.id }, data: { score: next } });
        }
        if (parsed.data.status === "LIVE") await tx.match.update({ where: { id: matchId }, data: { status: "LIVE", startedAt: existing.startedAt ?? new Date() } });
        if (parsed.data.status === "COMPLETED") await tx.match.update({ where: { id: matchId }, data: { status: "COMPLETED", endedAt: new Date() } });
        return tx.match.findUnique({ where: { id: matchId }, include: { sides: { include: { participants: true, scoreEvents: true } }, scoreEvents: { orderBy: { sequence: "asc" } } } });
      });
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update Battle Royale match" }, { status: 400 });
    }
  }

  /*
   * Generic Side A / Side B match engine.
   */
  const hasGenericSides = existing.sides.length === 2;

  const hasGenericScoreMutation = Boolean(
    parsed.data.sideScores ||
      parsed.data.scoreEvent ||
      parsed.data.winnerSideKey,
  );

  if (
    hasGenericSides &&
    (
      hasGenericScoreMutation ||
      parsed.data.status === "LIVE" ||
      parsed.data.status === "COMPLETED"
    )
  ) {
    try {
      /*
       * Start YouTube broadcast when moving to LIVE.
       */
      let youtubeBroadcastId = existing.youtubeBroadcastId;
      let youtubeVideoId = existing.youtubeVideoId;

      if (
        parsed.data.status === "LIVE" &&
        existing.status !== "LIVE"
      ) {
        if (!existing.stationId) {
          return NextResponse.json(
            {
              error:
                "Match must be assigned to a station before going LIVE",
            },
            { status: 409 },
          );
        }

        const broadcast =
          await createBroadcastForMatch(matchId);

        youtubeBroadcastId = broadcast.broadcastId;
        youtubeVideoId = broadcast.videoId;
      }

      const rules = resolveRules(
        existing.tournament.sport,
        (
          existing.rulesSnapshot ??
          existing.tournament.competitionRules
        ) as MatchRules | null,
      );

      const sideA = existing.sides.find(
        (side) => side.sideKey === "A",
      );

      const sideB = existing.sides.find(
        (side) => side.sideKey === "B",
      );

      if (!sideA || !sideB) {
        throw new Error(
          "Match must have Side A and Side B",
        );
      }

      if (parsed.data.scoreEvent) {
        validateScoreEvent(
          parsed.data.scoreEvent,
          rules,
        );
      }

      const result = await db.$transaction(async (tx) => {
        let scores = {
          A: sideA.score,
          B: sideB.score,
        };

        const sidesByKey = {
          A: sideA,
          B: sideB,
        };

        /*
         * Direct score update.
         */
        if (parsed.data.sideScores) {
          scores = {
            A:
              parsed.data.sideScores.A ??
              scores.A,
            B:
              parsed.data.sideScores.B ??
              scores.B,
          };

          await tx.matchSide.update({
            where: {
              id: sideA.id,
            },
            data: {
              score: scores.A,
            },
          });

          await tx.matchSide.update({
            where: {
              id: sideB.id,
            },
            data: {
              score: scores.B,
            },
          });
        }

        /*
         * Score event.
         */
        if (parsed.data.scoreEvent) {
          const sideKey = parsed.data.scoreEvent.sideKey;
          if (sideKey !== "A" && sideKey !== "B") {
            throw new Error("Generic matches only support Side A or Side B score events");
          }
          const side = sidesByKey[sideKey];

          const nextSequence =
            (await tx.matchScoreEvent.count({
              where: {
                matchId,
              },
            })) + 1;

          await tx.matchScoreEvent.create({
            data: {
              matchId,
              sideId: side.id,
              sequence: nextSequence,
              metric:
                parsed.data.scoreEvent.metric,
              value:
                parsed.data.scoreEvent.value,
              period:
                parsed.data.scoreEvent.period,
              metadata:
                parsed.data.scoreEvent.metadata as any,
            },
          });

          scores = {
            ...scores,
            [sideKey]:
              scores[sideKey] +
              parsed.data.scoreEvent.value,
          };

          await tx.matchSide.update({
            where: {
              id: side.id,
            },
            data: {
              score: scores[sideKey],
            },
          });
        }

        /*
         * Re-read score events so the outcome engine has
         * the authoritative event history.
         */
        const refreshedEvents =
          await tx.matchScoreEvent.findMany({
            where: {
              matchId,
            },
            orderBy: {
              sequence: "asc",
            },
          });

        const outcome = resolveOutcome(
          {
            key: "A",
            score: scores.A,
            events: refreshedEvents
              .filter(
                (event) =>
                  event.sideId === sideA.id,
              )
              .map((event) => ({
                sideKey: "A" as SideKey,
                metric: event.metric,
                value: event.value,
                period:
                  event.period ??
                  undefined,
                metadata:
                  (event.metadata ??
                    undefined) as
                    | Record<string, unknown>
                    | undefined,
                sequence: event.sequence,
              })),
          },
          {
            key: "B",
            score: scores.B,
            events: refreshedEvents
              .filter(
                (event) =>
                  event.sideId === sideB.id,
              )
              .map((event) => ({
                sideKey: "B" as SideKey,
                metric: event.metric,
                value: event.value,
                period:
                  event.period ??
                  undefined,
                metadata:
                  (event.metadata ??
                    undefined) as
                    | Record<string, unknown>
                    | undefined,
                sequence: event.sequence,
              })),
          },
          rules,
        );

        const winnerSideKey =
          parsed.data.winnerSideKey ??
          outcome.winnerSideKey;

        const winnerSideId =
          winnerSideKey
            ? sidesByKey[winnerSideKey].id
            : null;

        const completed =
          parsed.data.status === "COMPLETED";

        if (
          completed &&
          !winnerSideKey
        ) {
          throw new Error(
            "Cannot complete a tied generic match without winnerSideKey or a score that produces a winner",
          );
        }

        const updated =
          await tx.match.update({
            where: {
              id: matchId,
            },
            data: {
              ...(parsed.data.status
                ? {
                    status:
                      parsed.data.status,
                  }
                : {}),

              ...(parsed.data.status ===
              "LIVE"
                ? {
                    startedAt:
                      existing.startedAt ??
                      new Date(),
                    youtubeBroadcastId,
                    youtubeVideoId,
                  }
                : {}),

              ...(completed
                ? {
                    endedAt:
                      existing.endedAt ??
                      new Date(),
                    winnerSideId,
                    youtubeBroadcastId,
                    youtubeVideoId,
                  }
                : winnerSideKey
                  ? {
                      winnerSideId,
                    }
                  : {}),

              /*
               * Keep legacy player score fields synchronized.
               */
              playerOneScore:
                scores.A,

              playerTwoScore:
                scores.B,

              ...(winnerSideKey
                ? {
                    winnerId:
                      winnerSideKey === "A"
                        ? existing.playerOneId
                        : existing.playerTwoId,
                  }
                : {}),
            },
          });

        return {
          updated,
        };
      });

      /*
       * End YouTube broadcast after the DB update has succeeded.
       */
      if (
        result.updated.status ===
          "COMPLETED" &&
        existing.youtubeBroadcastId
      ) {
        try {
          await endBroadcastForMatch(
            matchId,
          );
        } catch (error) {
          console.error(
            "[youtube broadcast] failed to end broadcast",
            error,
          );

          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to end YouTube broadcast",
            },
            { status: 503 },
          );
        }
      }

      /*
       * Station becomes idle when the match completes.
       */
      if (
        result.updated.status ===
          "COMPLETED" &&
        result.updated.stationId
      ) {
        const station =
          await db.station.update({
            where: {
              id: result.updated.stationId,
            },
            data: {
              status: "IDLE",
              lastHeartbeatAt:
                new Date(),
            },
            select: {
              status: true,
              lastHeartbeatAt: true,
            },
          });

        await publishEvent({
          type: "station:status",
          tournamentId:
            result.updated.tournamentId,
          stationId:
            result.updated.stationId,
          status: station.status,
          lastHeartbeatAt:
            station.lastHeartbeatAt
              ?.toISOString() ?? null,
        });
      }

      await publishEvent({
        type: "match:updated",
        tournamentId:
          result.updated.tournamentId,
        matchId:
          result.updated.id,
        status:
          result.updated.status,
        playerOneScore:
          result.updated.playerOneScore,
        playerTwoScore:
          result.updated.playerTwoScore,
        winnerId:
          result.updated.winnerId,
        stationId:
          result.updated.stationId,
      });

      /*
       * Generic competition progression.
       *
       * IMPORTANT:
       * Use the new transaction-level progression API.
       *
       * Do NOT call progressMatch(result.updated.id, tx).
       * Do NOT expect progression.bracket or progression.competition.
       */
      if (
        result.updated.status ===
        "COMPLETED"
      ) {
        const progression =
          await progressMatchTransaction(
            db,
            result.updated.id,
          );

        await db.$transaction((tx) =>
          resolveCompetitionCompletion(
            tx,
            result.updated.id,
          ),
        );

        for (const downstream of progression.advanced as Array<{
          targetMatchId: string;
          targetSideKey: string;
        }>) {
          await publishEvent({
            type: "bracket:advanced",
            tournamentId: result.updated.tournamentId,
            bracketId: result.updated.bracketId ?? "",
            matchId: downstream.targetMatchId,
            targetSideKey: downstream.targetSideKey,
          });
        }

        for (
          const downstream of
            progression.stageRankAdvanced
        ) {
          await publishEvent({
            type: "bracket:advanced",
            tournamentId:
              result.updated.tournamentId,
            bracketId:
              result.updated.bracketId ??
              "",
            matchId:
              downstream.targetMatchId,
            targetSideKey:
              downstream.targetSideKey,
          });
        }
      }

      /*
       * Tournament completion check.
       */
      if (
        result.updated.status ===
        "COMPLETED"
      ) {
        const remaining =
          await db.match.count({
            where: {
              tournamentId:
                result.updated.tournamentId,
              status: {
                in: [
                  "QUEUED",
                  "LIVE",
                ],
              },
            },
          });

        if (remaining === 0) {
          await db.tournament.updateMany({
            where: {
              id: result.updated.tournamentId,
              status: {
                in: [
                  "LIVE",
                  "SCHEDULED",
                ],
              },
            },
            data: {
              status: "COMPLETED",
              endDate: new Date(),
            },
          });

          await publishEvent({
            type: "tournament:completed",
            tournamentId:
              result.updated.tournamentId,
          });
        }
      }

      /*
       * Notification.
       */
      const organization =
        await db.tournament.findUnique({
          where: {
            id: result.updated
              .tournamentId,
          },
          select: {
            organizationId: true,
          },
        });

      if (organization) {
        const notificationType =
          result.updated.status ===
          "LIVE"
            ? "MATCH_LIVE"
            : result.updated.status ===
                "COMPLETED"
              ? "MATCH_COMPLETED"
              : "TOURNAMENT_UPDATE";

        await db.notification.create({
          data: {
            organizationId:
              organization.organizationId,
            tournamentId:
              result.updated
                .tournamentId,
            type: notificationType,
            title:
              result.updated.status ===
              "LIVE"
                ? "Match is live"
                : result.updated.status ===
                    "COMPLETED"
                  ? "Match completed"
                  : "Match updated",
            message: `Match ${result.updated.id.slice(
              0,
              8,
            )} is now ${result.updated.status.toLowerCase()}.`,
            href: `/watch/${result.updated.id}`,
          },
        });
      }

      await writeAuditLog({
        tournamentId:
          result.updated.tournamentId,
        actorUserId: actor.id,
        action: `MATCH_${result.updated.status}`,
        entityType: "match",
        entityId: result.updated.id,
        metadata: {
          stationId:
            result.updated.stationId,
          playerOneScore:
            result.updated.playerOneScore,
          playerTwoScore:
            result.updated.playerTwoScore,
          winnerId:
            result.updated.winnerId,
          youtubeVideoId:
            result.updated.youtubeVideoId,
        },
      });

      return NextResponse.json({
        match: result.updated,
      });
    } catch (error) {
      console.error(
        "Generic match PATCH failed:",
        error,
      );

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to update match",
        },
        { status: 500 },
      );
    }
  }

  /*
   * Legacy playerOne/playerTwo match path.
   */
  const data: Record<string, unknown> = {};

  if (
    parsed.data.playerOneScore !==
    undefined
  ) {
    data.playerOneScore =
      parsed.data.playerOneScore;
  }

  if (
    parsed.data.playerTwoScore !==
    undefined
  ) {
    data.playerTwoScore =
      parsed.data.playerTwoScore;
  }

  if (parsed.data.status !== undefined) {
    data.status =
      parsed.data.status;
  }

  if (
    parsed.data.winnerId !== undefined
  ) {
    if (
      parsed.data.winnerId !==
        existing.playerOneId &&
      parsed.data.winnerId !==
        existing.playerTwoId
    ) {
      return NextResponse.json(
        {
          error:
            "winnerId must belong to one of the two players in this match",
        },
        { status: 400 },
      );
    }

    data.winnerId =
      parsed.data.winnerId;
  }

  if (
    parsed.data.status === "LIVE" &&
    existing.status !== "LIVE"
  ) {
    if (!existing.stationId) {
      return NextResponse.json(
        {
          error:
            "Match must be assigned to a station before going LIVE",
        },
        { status: 409 },
      );
    }

    try {
      const broadcast =
        await createBroadcastForMatch(
          matchId,
        );

      data.youtubeBroadcastId =
        broadcast.broadcastId;
      data.youtubeVideoId =
        broadcast.videoId;
      data.startedAt =
        existing.startedAt ??
        new Date();
    } catch (error) {
      console.error(
        "[youtube broadcast] failed to create broadcast",
        error,
      );

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to prepare YouTube Live",
        },
        { status: 503 },
      );
    }
  }

  if (
    parsed.data.status ===
    "COMPLETED"
  ) {
    if (existing.sides.length !== 2) {
      return NextResponse.json(
        {
          error:
            "Match requires exactly two sides.",
        },
        { status: 409 },
      );
    }

    const finalPlayerOneScore =
      parsed.data.playerOneScore ??
      existing.playerOneScore;

    const finalPlayerTwoScore =
      parsed.data.playerTwoScore ??
      existing.playerTwoScore;

    const suppliedWinnerId =
      parsed.data.winnerId;

    const inferredWinnerId =
      suppliedWinnerId ??
      (finalPlayerOneScore >
      finalPlayerTwoScore
        ? existing.playerOneId
        : finalPlayerTwoScore >
            finalPlayerOneScore
          ? existing.playerTwoId
          : undefined);

    if (
      suppliedWinnerId &&
      suppliedWinnerId !==
        existing.playerOneId &&
      suppliedWinnerId !==
        existing.playerTwoId
    ) {
      return NextResponse.json(
        {
          error:
            "winnerId must belong to one of the two players in this match",
        },
        { status: 400 },
      );
    }

    if (!inferredWinnerId) {
      return NextResponse.json(
        {
          error:
            "Cannot complete a tied match without winnerId. Set the final score or explicitly select the winner.",
        },
        { status: 409 },
      );
    }

    data.winnerId =
      inferredWinnerId;

    try {
      await endBroadcastForMatch(
        matchId,
      );
    } catch (error) {
      console.error(
        "[youtube broadcast] failed to end broadcast",
        error,
      );

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to end YouTube broadcast",
        },
        { status: 503 },
      );
    }

    data.endedAt =
      existing.endedAt ??
      new Date();
  }

  const updated =
    await db.match.update({
      where: {
        id: matchId,
      },
      data: data as any,
    });

  if (
    updated.status ===
      "COMPLETED" &&
    updated.stationId
  ) {
    const station =
      await db.station.update({
        where: {
          id: updated.stationId,
        },
        data: {
          status: "IDLE",
          lastHeartbeatAt:
            new Date(),
        },
        select: {
          status: true,
          lastHeartbeatAt: true,
        },
      });

    await publishEvent({
      type: "station:status",
      tournamentId:
        updated.tournamentId,
      stationId:
        updated.stationId,
      status: station.status,
      lastHeartbeatAt:
        station.lastHeartbeatAt
          ?.toISOString() ?? null,
    });
  }

  await publishEvent({
    type: "match:updated",
    tournamentId:
      updated.tournamentId,
    matchId: updated.id,
    status: updated.status,
    playerOneScore:
      updated.playerOneScore,
    playerTwoScore:
      updated.playerTwoScore,
    winnerId: updated.winnerId,
    stationId: updated.stationId,
  });

  /*
   * Progression for legacy matches too.
   */
  if (
    updated.status ===
    "COMPLETED"
  ) {
    const progression =
      await progressMatchTransaction(
        db,
        updated.id,
      );

    await db.$transaction((tx) =>
      resolveCompetitionCompletion(
        tx,
        updated.id,
      ),
    );

    for (
      const downstream of
        progression.advanced
    ) {
      await publishEvent({
        type: "bracket:advanced",
        tournamentId:
          updated.tournamentId,
        bracketId:
          updated.bracketId ?? "",
        matchId:
          downstream.targetMatchId,
        targetSideKey:
          downstream.targetSideKey,
      });
    }

    for (
      const downstream of
        progression.stageRankAdvanced
    ) {
      await publishEvent({
        type: "bracket:advanced",
        tournamentId:
          updated.tournamentId,
        bracketId:
          updated.bracketId ?? "",
        matchId:
          downstream.targetMatchId,
        targetSideKey:
          downstream.targetSideKey,
      });
    }
  }

  if (
    updated.status ===
    "COMPLETED"
  ) {
    const remaining =
      await db.match.count({
        where: {
          tournamentId:
            updated.tournamentId,
          status: {
            in: [
              "QUEUED",
              "LIVE",
            ],
          },
        },
      });

    if (remaining === 0) {
      await db.tournament.updateMany({
        where: {
          id: updated.tournamentId,
          status: {
            in: [
              "LIVE",
              "SCHEDULED",
            ],
          },
        },
        data: {
          status: "COMPLETED",
          endDate: new Date(),
        },
      });

      await publishEvent({
        type: "tournament:completed",
        tournamentId:
          updated.tournamentId,
      });
    }
  }

  const organization =
    await db.tournament.findUnique({
      where: {
        id: updated.tournamentId,
      },
      select: {
        organizationId: true,
      },
    });

  if (organization) {
    const notificationType =
      updated.status === "LIVE"
        ? "MATCH_LIVE"
        : updated.status ===
            "COMPLETED"
          ? "MATCH_COMPLETED"
          : "TOURNAMENT_UPDATE";

    await db.notification.create({
      data: {
        organizationId:
          organization.organizationId,
        tournamentId:
          updated.tournamentId,
        type: notificationType,
        title:
          updated.status ===
          "LIVE"
            ? "Match is live"
            : updated.status ===
                "COMPLETED"
              ? "Match completed"
              : "Match updated",
        message: `Match ${updated.id.slice(
          0,
          8,
        )} is now ${updated.status.toLowerCase()}.`,
        href: `/watch/${updated.id}`,
      },
    });
  }

  await writeAuditLog({
    tournamentId:
      updated.tournamentId,
    actorUserId: actor.id,
    action: `MATCH_${updated.status}`,
    entityType: "match",
    entityId: updated.id,
    metadata: {
      stationId:
        updated.stationId,
      playerOneScore:
        updated.playerOneScore,
      playerTwoScore:
        updated.playerTwoScore,
      winnerId:
        updated.winnerId,
      youtubeVideoId:
        updated.youtubeVideoId,
    },
  });

  return NextResponse.json({
    match: updated,
  });
}