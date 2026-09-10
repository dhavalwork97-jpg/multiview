import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { resolveRules } from "@/lib/match-engine";

const SLUG = "fgc-masters-2026-showcase";

export async function POST() {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.upsert({
        where: { slug: `fgc-showcase-${user.id}` },
        update: {},
        create: {
          name: "FGC Masters Showcase",
          slug: `fgc-showcase-${user.id}`,
          ownerId: user.id,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });

      const tournament = await tx.tournament.upsert({
        where: { slug: SLUG },
        update: { publicEnabled: true, status: "LIVE", organizationId: organization.id, organizerId: user.id },
        create: {
          name: "FGC Masters 2026 — Championship Weekend",
          slug: SLUG,
          game: "Multi-Game Championship",
          status: "LIVE",
          startDate: new Date(),
          venue: "FGC Arena",
          organizerId: user.id,
          organizationId: organization.id,
          format: "SINGLE_ELIMINATION",
          sport: "esports",
          competitionType: "festival",
          participantMode: "mixed",
          scoringMode: "points",
          publicEnabled: true,
          competitionRules: {
            showcase: true,
            brand: "FGC Masters",
            description: "Interconnected demo competition for product showcase and broadcast validation.",
          } as Prisma.InputJsonValue,
        },
      });

      const existingStages = await tx.competitionStage.count({ where: { tournamentId: tournament.id } });
      if (existingStages === 0) {
        const teams = await Promise.all(
          ["NOVA", "VOLT", "APEX", "TITAN", "ORBIT", "RIVAL"].map((name, i) =>
            tx.team.create({ data: { name: `${name} Esports`, slug: `fgc-showcase-${name.toLowerCase()}` } }),
          ),
        );
        const players = await Promise.all(
          ["Raze", "Nyx", "Kairo", "Vex", "Zed", "Miko", "Flux", "Jett", "Ace", "Rin", "Blaze", "Echo"].map((gamertag, i) =>
            tx.player.create({ data: { gamertag: `FGC_${gamertag}_${i + 1}`, realName: `Showcase Player ${i + 1}`, country: ["IN", "US", "JP", "BR"][i % 4] } }),
          ),
        );
        for (let i = 0; i < teams.length; i++) {
          await tx.teamMember.create({ data: { teamId: teams[i].id, playerId: players[i].id, role: "PLAYER" } });
          await tx.tournamentTeam.create({ data: { tournamentId: tournament.id, teamId: teams[i].id, seed: i + 1 } });
        }
        for (let i = 0; i < players.length; i++) {
          await tx.tournamentEntrant.create({ data: { tournamentId: tournament.id, playerId: players[i].id, seed: i + 1 } });
        }

        const specs = [
          { name: "VALORANT — Arena Stage", kind: "KNOCKOUT" as const, sport: "valorant", adapter: "rounds", rules: { bestOf: 1, winCondition: "highest_score", allowedMetrics: ["rounds"] } },
          { name: "Street Fighter 6 — Finals", kind: "KNOCKOUT" as const, sport: "fighting", adapter: "rounds", rules: { bestOf: 3, winCondition: "highest_score", allowedMetrics: ["rounds"] } },
          { name: "BGMI — Battle Royale Lobby", kind: "GROUP" as const, sport: "bgmi", adapter: "battle_royale", rules: { bestOf: 1, winCondition: "highest_score", allowedMetrics: ["placement", "kills", "points"], finishPoints: 1, placementPoints: { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 }, tiebreakers: ["first_place_finishes", "placement_points", "kills", "most_recent_match"] } },
          { name: "Football — League Table", kind: "LEAGUE" as const, sport: "football", adapter: "goals", rules: { bestOf: 1, winCondition: "highest_score", allowedMetrics: ["goals"], winPoints: 3, drawPoints: 1, lossPoints: 0 } },
        ];
        for (let i = 0; i < specs.length; i++) {
          const spec = specs[i];
          const rules = resolveRules(spec.sport, spec.rules);
          const stage = await tx.competitionStage.create({ data: { tournamentId: tournament.id, name: spec.name, kind: spec.kind, orderIndex: i, status: "LIVE", rules: rules as Prisma.InputJsonValue } });
          const match = await tx.match.create({ data: { tournamentId: tournament.id, stageId: stage.id, round: spec.kind === "GROUP" ? "Battle Royale Lobby 1" : "Showcase Match 1", status: "COMPLETED", startedAt: new Date(Date.now() - 20 * 60_000), endedAt: new Date(), engineVersion: "v36-showcase", scoringAdapter: rules.scoringAdapter ?? spec.adapter, rulesSnapshot: rules as Prisma.InputJsonValue } });
          const a = await tx.matchSide.create({ data: { matchId: match.id, sideKey: "A", label: teams[i % teams.length].name, score: spec.sport === "bgmi" ? 15 : 3 } });
          const b = await tx.matchSide.create({ data: { matchId: match.id, sideKey: "B", label: teams[(i + 1) % teams.length].name, score: spec.sport === "bgmi" ? 13 : 1 } });
          await tx.matchParticipant.createMany({ data: [{ sideId: a.id, teamId: teams[i % teams.length].id }, { sideId: b.id, teamId: teams[(i + 1) % teams.length].id }] });
          const events = spec.sport === "bgmi" ? [{ sideId: a.id, metric: "placement", value: 1 }, { sideId: a.id, metric: "kills", value: 5 }, { sideId: b.id, metric: "placement", value: 2 }, { sideId: b.id, metric: "kills", value: 7 }] : [{ sideId: a.id, metric: rules.allowedMetrics?.[0] ?? "points", value: 3 }, { sideId: b.id, metric: rules.allowedMetrics?.[0] ?? "points", value: 1 }];
          await tx.matchScoreEvent.createMany({ data: events.map((e, n) => ({ matchId: match.id, sideId: e.sideId, sequence: n + 1, metric: e.metric, value: e.value })) });
          await tx.match.update({ where: { id: match.id }, data: { playerOneScore: a.score, playerTwoScore: b.score, winnerSideId: a.id } });
        }
      }

      return { tournamentId: tournament.id, name: tournament.name };
    });
    return NextResponse.json({ ok: true, ...result, urls: { viewer: `/tournaments/${result.tournamentId}`, broadcast: "/admin/broadcast", showcase: "/showcase", overlay: `/overlay/${result.tournamentId}`, standings: `/overlay/standings?tournamentId=${result.tournamentId}`, controlRoom: `/admin/tournaments/${result.tournamentId}/control-room`, multiview: `/admin/tournaments/${result.tournamentId}/multiview` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to seed showcase";
    const status = message.includes("Insufficient") || message.includes("Not signed") ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
