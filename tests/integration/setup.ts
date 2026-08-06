import { db } from "@/lib/db";

// Order matters — children before parents, respecting FK constraints.
// Simplest correct approach for a test DB this size; would swap for
// per-test transactions-that-rollback if the suite grows large enough
// for this to be a speed problem.
export async function resetDb() {
  await db.$transaction([
    db.clip.deleteMany(),
    db.matchEvent.deleteMany(),
    db.recording.deleteMany(),
    db.watchHistoryEntry.deleteMany(),
    db.favorite.deleteMany(),
    db.match.deleteMany(),
    db.station.deleteMany(),
    db.bracket.deleteMany(),
    db.tournamentEntrant.deleteMany(),
    db.tournament.deleteMany(),
    db.player.deleteMany(),
    db.user.deleteMany(),
  ]);
}

export async function createUser(role: "VIEWER" | "ORGANIZER" | "ADMIN" = "VIEWER") {
  return db.user.create({
    data: {
      clerkId: `test-clerk-${crypto.randomUUID()}`,
      email: `${crypto.randomUUID()}@example.test`,
      username: `user-${crypto.randomUUID().slice(0, 8)}`,
      role,
    },
  });
}

export async function createTournament(organizerId: string) {
  return db.tournament.create({
    data: {
      name: "Test Open 2026",
      slug: `test-open-${crypto.randomUUID().slice(0, 8)}`,
      game: "Street Fighter 6",
      startDate: new Date(),
      organizerId,
    },
  });
}

export async function createPlayer(gamertag: string) {
  return db.player.create({ data: { gamertag } });
}

export async function createStation(tournamentId: string, label = "Station 1") {
  return db.station.create({ data: { tournamentId, label } });
}
