import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error(
      "Usage: npx tsx prisma/seed.ts <clerkId-or-email>\n" +
        "Find your user's clerkId or email in Prisma Studio's User table."
    );
    process.exit(1);
  }

  const user = await db.user.findFirst({
    where: {
      OR: [{ clerkId: identifier }, { email: identifier }],
    },
  });

  if (!user) {
    console.error(`No user found matching "${identifier}". Check Prisma Studio's User table for the right clerkId or email.`);
    process.exit(1);
  }

  const tournament = await db.tournament.create({
    data: {
      name: "Test Tournament",
      slug: `test-tournament-${Date.now()}`,
      game: "Street Fighter 6",
      status: "SCHEDULED",
      startDate: new Date(),
      organizerId: user.id,
    },
  });

  const station = await db.station.create({
    data: {
      tournamentId: tournament.id,
      label: "Station 1",
      status: "OFFLINE",
    },
  });

  console.log("Created tournament:", tournament.id, tournament.name);
  console.log("Created station:", station.id, station.label);
  console.log("\nUse this station ID for the ingress test:");
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