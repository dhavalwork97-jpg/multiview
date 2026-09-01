import { Prisma, PrismaClient } from "@prisma/client";
import { resolveRules } from "@/lib/match-engine";

const db = new PrismaClient();

type GameSpec = {
  sport: string;
  game: string;
  label: string;
  stageKind: "GROUP" | "KNOCKOUT" | "LEAGUE" | "QUALIFIER";
  participantMode: "individual" | "team";
  scoringAdapter: string;
  rules: Record<string, unknown>;
};

const GAMES: GameSpec[] = [
  {
    sport: "fighting",
    game: "Street Fighter 6",
    label: "Street Fighter 6",
    stageKind: "KNOCKOUT",
    participantMode: "individual",
    scoringAdapter: "rounds",
    rules: { bestOf: 3, winCondition: "highest_score", allowedMetrics: ["rounds"] },
  },
  {
    sport: "valorant",
    game: "VALORANT",
    label: "VALORANT",
    stageKind: "KNOCKOUT",
    participantMode: "team",
    scoringAdapter: "rounds",
    rules: { bestOf: 1, winCondition: "highest_score", allowedMetrics: ["rounds"] },
  },
  {
    sport: "football",
    game: "Football",
    label: "Football",
    stageKind: "LEAGUE",
    participantMode: "team",
    scoringAdapter: "goals",
    rules: { bestOf: 1, winCondition: "highest_score", allowedMetrics: ["goals"], winPoints: 3, drawPoints: 1, lossPoints: 0 },
  },
  {
    sport: "tennis",
    game: "Tennis",
    label: "Tennis",
    stageKind: "KNOCKOUT",
    participantMode: "individual",
    scoringAdapter: "sets",
    rules: { bestOf: 3, winCondition: "highest_score", allowedMetrics: ["sets"] },
  },
  {
    sport: "racing",
    game: "Time Trial",
    label: "Racing / Time Trial",
    stageKind: "QUALIFIER",
    participantMode: "individual",
    scoringAdapter: "time",
    rules: { bestOf: 1, winCondition: "highest_score", direction: "lower_wins", allowedMetrics: ["milliseconds", "seconds"] },
  },
  {
    sport: "bgmi",
    game: "BGMI Battle Royale",
    label: "BGMI Battle Royale",
    stageKind: "GROUP",
    participantMode: "team",
    scoringAdapter: "battle_royale",
    rules: {
      bestOf: 1,
      winCondition: "highest_score",
      allowedMetrics: ["placement", "kills", "points"],
      finishPoints: 1,
      placementPoints: { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 },
      tiebreakers: ["first_place_finishes", "placement_points", "kills", "most_recent_match"],
    },
  },
];

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Usage: npx tsx prisma/seed-demo-pack.ts <clerkId-or-email>");
    process.exit(1);
  }

  const user = await db.user.findFirst({ where: { OR: [{ clerkId: identifier }, { email: identifier }] } });
  if (!user) throw new Error(`No user found matching "${identifier}".`);

  const organization = await db.organization.upsert({
    where: { slug: `demo-pack-${user.id}` },
    update: {},
    create: {
      name: `${user.username ?? "Demo"} Multi-Game Events`,
      slug: `demo-pack-${user.id}`,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const tournament = await db.tournament.create({
    data: {
      name: "FGC Multi-Game Demo Pack",
      slug: `fgc-multi-game-demo-${Date.now()}`,
      game: "Multi-Game Demo Pack",
      status: "LIVE",
      startDate: new Date(),
      venue: "FGC Demo Arena",
      organizerId: user.id,
      organizationId: organization.id,
      format: "SINGLE_ELIMINATION",
      sport: "esports",
      competitionType: "festival",
      participantMode: "mixed",
      scoringMode: "points",
      competitionRules: {
        demoPack: true,
        games: GAMES.map((g) => ({ game: g.game, sport: g.sport, scoringAdapter: g.scoringAdapter })),
      } as Prisma.InputJsonValue,
    },
  });

  const stations = await Promise.all(
    Array.from({ length: 6 }, (_, i) => db.station.create({
      data: { tournamentId: tournament.id, label: `Demo Station ${i + 1}`, status: "OFFLINE" },
    })),
  );

  const demoPlayers = await Promise.all(
    Array.from({ length: 12 }, (_, i) => db.player.create({
      data: {
        gamertag: `DEMO_${String(i + 1).padStart(2, "0")}_${Date.now()}`,
        realName: `Demo Player ${i + 1}`,
        country: ["IN", "US", "JP", "BR"][i % 4],
      },
    })),
  );

  const teams = await Promise.all(
    Array.from({ length: 8 }, (_, i) => db.team.create({
      data: { name: `Demo Squad ${String(i + 1).padStart(2, "0")}`, slug: `demo-squad-${Date.now()}-${i}` },
    })),
  );

  for (let i = 0; i < teams.length; i++) {
    await db.teamMember.create({ data: { teamId: teams[i].id, playerId: demoPlayers[i % demoPlayers.length].id, role: "PLAYER" } });
  }

  for (let i = 0; i < demoPlayers.length; i++) {
    await db.tournamentEntrant.create({ data: { tournamentId: tournament.id, playerId: demoPlayers[i].id, seed: i + 1 } });
  }
  for (let i = 0; i < teams.length; i++) {
    await db.tournamentTeam.create({ data: { tournamentId: tournament.id, teamId: teams[i].id, seed: i + 1 } });
  }

  const summary: string[] = [];

  for (let gameIndex = 0; gameIndex < GAMES.length; gameIndex++) {
    const game = GAMES[gameIndex];
    const rules = resolveRules(game.sport, game.rules);
    const stage = await db.competitionStage.create({
      data: {
        tournamentId: tournament.id,
        name: game.label,
        kind: game.stageKind,
        orderIndex: gameIndex,
        status: "LIVE",
        rules: rules as Prisma.InputJsonValue,
      },
    });

    const isTeam = game.participantMode === "team";
    const pA = isTeam ? null : demoPlayers[(gameIndex * 2) % demoPlayers.length];
    const pB = isTeam ? null : demoPlayers[(gameIndex * 2 + 1) % demoPlayers.length];
    const tA = isTeam ? teams[(gameIndex * 2) % teams.length] : null;
    const tB = isTeam ? teams[(gameIndex * 2 + 1) % teams.length] : null;

    const match = await db.match.create({
      data: {
        tournamentId: tournament.id,
        stageId: stage.id,
        stationId: stations[gameIndex].id,
        round: game.stageKind === "GROUP" ? "Battle Royale Match 1" : "Demo Match 1",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 15 * 60_000),
        endedAt: new Date(),
        engineVersion: "v31.6-demo",
        scoringAdapter: rules.scoringAdapter ?? game.scoringAdapter,
        rulesSnapshot: rules as Prisma.InputJsonValue,
      },
    });

    const sideA = await db.matchSide.create({ data: { matchId: match.id, sideKey: "A", label: pA?.gamertag ?? tA?.name ?? "Side A", score: 0 } });
    const sideB = await db.matchSide.create({ data: { matchId: match.id, sideKey: "B", label: pB?.gamertag ?? tB?.name ?? "Side B", score: 0 } });

    if (pA) await db.matchParticipant.create({ data: { sideId: sideA.id, playerId: pA.id } });
    if (pB) await db.matchParticipant.create({ data: { sideId: sideB.id, playerId: pB.id } });
    if (tA) await db.matchParticipant.create({ data: { sideId: sideA.id, teamId: tA.id } });
    if (tB) await db.matchParticipant.create({ data: { sideId: sideB.id, teamId: tB.id } });

    const events = game.sport === "bgmi"
      ? [
          { sideId: sideA.id, metric: "placement", value: 1 },
          { sideId: sideA.id, metric: "kills", value: 5 },
          { sideId: sideB.id, metric: "placement", value: 2 },
          { sideId: sideB.id, metric: "kills", value: 7 },
        ]
      : game.scoringAdapter === "time"
      ? [
          { sideId: sideA.id, metric: "seconds", value: 92 },
          { sideId: sideB.id, metric: "seconds", value: 97 },
        ]
      : [
          { sideId: sideA.id, metric: rules.allowedMetrics?.[0] ?? "points", value: 3 },
          { sideId: sideB.id, metric: rules.allowedMetrics?.[0] ?? "points", value: 1 },
        ];

    await db.matchScoreEvent.createMany({
      data: events.map((event, sequence) => ({ matchId: match.id, sideId: event.sideId, sequence: sequence + 1, metric: event.metric, value: event.value })),
    });

    const scoreA = game.sport === "bgmi" ? 15 : game.scoringAdapter === "time" ? 92 : 3;
    const scoreB = game.sport === "bgmi" ? 13 : game.scoringAdapter === "time" ? 97 : 1;
    await db.matchSide.update({ where: { id: sideA.id }, data: { score: scoreA } });
    await db.matchSide.update({ where: { id: sideB.id }, data: { score: scoreB } });
    await db.match.update({ where: { id: match.id }, data: { playerOneScore: scoreA, playerTwoScore: scoreB, winnerSideId: sideA.id } });

    summary.push(`${game.label}: ${match.id} (${scoreA}-${scoreB})`);
  }

  console.log(`Created demo tournament: ${tournament.id}`);
  console.log(`Name: ${tournament.name}`);
  console.log(`URL: /tournaments/${tournament.id}`);
  console.log("Games:");
  summary.forEach((line) => console.log(`  ${line}`));
  console.log("\\nBGMI demo scoring: 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th-8th=1, 9th-16th=0; each finish=+1.");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());
