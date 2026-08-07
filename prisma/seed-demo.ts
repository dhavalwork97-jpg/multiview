import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Full demo seed: creates a Tournament, Station, two Players, their
// TournamentEntrant rows, and a Match assigned to the station with
// status LIVE — so that pushing a stream into the station's ingress
// actually triggers HLS egress (src/lib/livekit.ts requires a
// QUEUED/LIVE Match on the station before it starts egress, per
// room_started in src/app/api/webhooks/livekit/route.ts). Without a
// Match, /multiview will always show "offline" even while the
// underlying Station.status is LIVE, since MultiView only renders a
// tile when hlsPlaylistKey is populated.
//
// Usage: npx tsx prisma/seed-demo.ts <your-clerk-user-id-OR-email>

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error(
      "Usage: npx tsx prisma/seed-demo.ts <clerkId-or-email>\n" +
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

  const tournament = await db.tournament.create({
    data: {
      name: "Demo Tournament",
      slug: `demo-tournament-${Date.now()}`,
      game: "Street Fighter 6",
      status: "LIVE",
      startDate: new Date(),
      venue: "Demo Arena",
      organizerId: user.id,
    },
  });

  const station = await db.station.create({
    data: {
      tournamentId: tournament.id,
      label: "Station 1",
      status: "OFFLINE", // flips to LIVE for real once the webhook fires
    },
  });

  const playerOne = await db.player.create({
    data: { gamertag: `DemoP1_${Date.now()}`, realName: "Demo Player One", country: "US" },
  });
  const playerTwo = await db.player.create({
    data: { gamertag: `DemoP2_${Date.now()}`, realName: "Demo Player Two", country: "JP" },
  });

  await db.tournamentEntrant.createMany({
    data: [
      { tournamentId: tournament.id, playerId: playerOne.id, seed: 1 },
      { tournamentId: tournament.id, playerId: playerTwo.id, seed: 2 },
    ],
  });

  const match = await db.match.create({
    data: {
      tournamentId: tournament.id,
      stationId: station.id,
      playerOneId: playerOne.id,
      playerTwoId: playerTwo.id,
      round: "Grand Finals",
      status: "QUEUED", // room_started's liveMatch lookup matches QUEUED or LIVE
    },
  });

  console.log("Created tournament:", tournament.id, tournament.name);
  console.log("Created station:", station.id, station.label);
  console.log("Created players:", playerOne.gamertag, "vs", playerTwo.gamertag);
  console.log("Created match:", match.id, match.round);
  console.log("\nStation ID for ingress creation:");
  console.log(station.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });