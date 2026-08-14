import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Full demo seed: creates a Tournament, N Stations, 2N Players, their
// TournamentEntrant rows, a Bracket (so /tournaments/:id has something to
// render), and one first-round Match per station — so that pushing a
// stream into a station's ingress actually triggers HLS egress
// (src/lib/livekit.ts requires a QUEUED/LIVE Match on the station before
// it starts egress, per room_started in
// src/app/api/webhooks/livekit/route.ts). Without a Match, /multiview
// will always show "offline" even while the underlying Station.status is
// LIVE, since MultiView only renders a tile when hlsPlaylistKey is
// populated. Without a Bracket, /tournaments/:id has nothing to display
// at all — that's the row this seed was missing before.
//
// Defaults to 4 simultaneous first-round matches (8 players / 4
// stations) so the bracket watch dock actually has more than one match
// to switch between. Pass a station count as the second argument to
// change that, e.g. `npx tsx prisma/seed-demo.ts you@example.com 2`.
//
// Usage: npx tsx prisma/seed-demo.ts <your-clerk-user-id-OR-email> [stationCount]

async function main() {
  const identifier = process.argv[2];
  const stationCount = Number(process.argv[3] ?? 4);

  if (!identifier) {
    console.error(
      "Usage: npx tsx prisma/seed-demo.ts <clerkId-or-email> [stationCount]\n" +
        "Find your user's clerkId or email in Prisma Studio's User table."
    );
    process.exit(1);
  }

  const user = await db.user.findFirst({
    where: { OR: [{ clerkId: identifier }, { email: identifier }] },
  });

  if (!user) {
    console.error(`No user found matching "${identifier}". Check Prisma Studio's User table for the right clerkId or email.`);
    process.exit(1);
  }

  const organization = await db.organization.upsert({
    where: { slug: `demo-${user.id}` },
    update: {},
    create: {
      name: `${user.username ?? "Demo"} Events`,
      slug: `demo-${user.id}`,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const tournament = await db.tournament.create({
    data: {
      name: "Demo Tournament",
      slug: `demo-tournament-${Date.now()}`,
      game: "Street Fighter 6",
      status: "LIVE",
      startDate: new Date(),
      venue: "Demo Arena",
      organizerId: user.id,
      organizationId: organization.id,
    },
  });

  const bracket = await db.bracket.create({
    data: {
      tournamentId: tournament.id,
      name: "Winners Bracket",
      format: "single_elimination",
      // Backfilled with real slots below once players/matches exist —
      // structure is the layout InteractiveBracket renders, independent
      // of the relational Match rows (see api/brackets/route.ts).
      structure: [],
    },
  });

  const stations = [];
  for (let i = 1; i <= stationCount; i++) {
    stations.push(
      await db.station.create({
        data: {
          tournamentId: tournament.id,
          label: `Station ${i}`,
          status: "OFFLINE", // flips to LIVE for real once the webhook fires
        },
      })
    );
  }

  const roundSlots: { playerOneId: string; playerTwoId: string; round: string }[] = [];
  const matchSummaries: { id: string; round: string; p1: string; p2: string }[] = [];

  for (let i = 0; i < stationCount; i++) {
    const station = stations[i];
    const suffix = `${Date.now()}_${i}`;

    const playerOne = await db.player.create({
      data: { gamertag: `DemoP1_${suffix}`, realName: `Demo Player ${i * 2 + 1}`, country: "US" },
    });
    const playerTwo = await db.player.create({
      data: { gamertag: `DemoP2_${suffix}`, realName: `Demo Player ${i * 2 + 2}`, country: "JP" },
    });

    await db.tournamentEntrant.createMany({
      data: [
        { tournamentId: tournament.id, playerId: playerOne.id, seed: i * 2 + 1 },
        { tournamentId: tournament.id, playerId: playerTwo.id, seed: i * 2 + 2 },
      ],
    });

    const round = "Winners Round 1";
    const match = await db.match.create({
      data: {
        tournamentId: tournament.id,
        bracketId: bracket.id,
        stationId: station.id,
        playerOneId: playerOne.id,
        playerTwoId: playerTwo.id,
        round,
        status: "QUEUED", // room_started's liveMatch lookup matches QUEUED or LIVE
        roundIndex: 0,
        matchIndex: i, // position within Round 1 — advanceBracket() maps this to floor(i/2) in Round 2
      },
    });

    roundSlots.push({ playerOneId: playerOne.id, playerTwoId: playerTwo.id, round });
    matchSummaries.push({ id: match.id, round, p1: playerOne.gamertag, p2: playerTwo.gamertag });
  }

  // A Round 2 (and beyond, for stationCount > 2) with empty TBD slots isn't
  // just decorative — advanceBracket() (src/lib/bracket-progression.ts)
  // writes a Round 1 winner into rounds[1].matches[floor(matchIndex/2)],
  // and does nothing if that slot doesn't exist in `structure` yet. This
  // pre-declares every later round's slot count (halving each round) so
  // that write always lands somewhere, all the way to a single final.
  const structure: { name: string; matches: { playerOneId: string | null; playerTwoId: string | null; round: string }[] }[] = [
    { name: "Winners Round 1", matches: roundSlots },
  ];
  let slotsInRound = roundSlots.length;
  let roundNumber = 2;
  while (slotsInRound > 1) {
    slotsInRound = Math.floor(slotsInRound / 2);
    const roundName = slotsInRound === 1 ? "Grand Final" : `Winners Round ${roundNumber}`;
    structure.push({
      name: roundName,
      matches: Array.from({ length: slotsInRound }, () => ({
        playerOneId: null,
        playerTwoId: null,
        round: roundName,
      })),
    });
    roundNumber++;
  }

  await db.bracket.update({
    where: { id: bracket.id },
    data: { structure },
  });

  console.log("Created tournament:", tournament.id, tournament.name);
  console.log("Created bracket:", bracket.id, bracket.name);
  console.log("Created stations:", stations.map((s) => `${s.label} (${s.id})`).join(", "));
  console.log("Created matches:");
  for (const m of matchSummaries) {
    console.log(`  ${m.id}  ${m.round}  ${m.p1} vs ${m.p2}`);
  }
  console.log("\nView it at:");
  console.log(`  /tournaments/${tournament.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });