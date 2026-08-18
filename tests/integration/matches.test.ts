import { describe, it, expect, beforeEach, vi } from "vitest";

// vi.hoisted so `authState` exists before the mock factory below runs —
// Vitest hoists vi.mock calls to the top of the file, and a plain const
// declared after it would be in the temporal dead zone when the factory
// first executes.
const { authState } = vi.hoisted(() => ({ authState: { userId: null as string | null } }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: authState.userId }),
}));

import { GET, POST } from "@/app/api/matches/route";
import { db } from "@/lib/db";
import { resetDb, createUser, createTournament, createPlayer, createStation, createTeam } from "./setup";

describe("GET /api/matches", () => {
  beforeEach(async () => {
    authState.userId = null;
    await resetDb();
  });

  it("returns only LIVE matches by default, no auth required", async () => {
    const organizer = await createUser("ORGANIZER");
    const tournament = await createTournament(organizer.id);
    const [p1, p2] = await Promise.all([createPlayer("Alice"), createPlayer("Bob")]);

    await db.match.create({
      data: { tournamentId: tournament.id, playerOneId: p1.id, playerTwoId: p2.id, status: "LIVE" },
    });
    await db.match.create({
      data: { tournamentId: tournament.id, playerOneId: p1.id, playerTwoId: p2.id, status: "COMPLETED" },
    });

    const res = await GET(new Request("http://test/api/matches"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].status).toBe("LIVE");
  });
});

describe("POST /api/matches", () => {
  beforeEach(async () => {
    authState.userId = null;
    await resetDb();
  });

  it("rejects a signed-out request", async () => {
    const res = await POST(
      new Request("http://test/api/matches", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(403);
  });

  it("rejects a VIEWER (not organizer/admin)", async () => {
    const viewer = await createUser("VIEWER");
    authState.userId = viewer.clerkId;

    const res = await POST(
      new Request("http://test/api/matches", { method: "POST", body: JSON.stringify({}) })
    );
    expect(res.status).toBe(403);
  });

  it("lets an ORGANIZER create a match with valid input", async () => {
    const organizer = await createUser("ORGANIZER");
    authState.userId = organizer.clerkId;
    const tournament = await createTournament(organizer.id);
    const station = await createStation(tournament.id);
    const [p1, p2] = await Promise.all([createPlayer("Chun-Li"), createPlayer("Ryu")]);

    const res = await POST(
      new Request("http://test/api/matches", {
        method: "POST",
        body: JSON.stringify({
          tournamentId: tournament.id,
          stationId: station.id,
          playerOneId: p1.id,
          playerTwoId: p2.id,
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.match.status).toBe("QUEUED");
  });

  it("rejects malformed input with a 400, not a 500", async () => {
    const organizer = await createUser("ORGANIZER");
    authState.userId = organizer.clerkId;

    const res = await POST(
      new Request("http://test/api/matches", {
        method: "POST",
        body: JSON.stringify({ tournamentId: 12345 /* should be a string */ }),
      })
    );
    expect(res.status).toBe(400);
  });
});


describe("generic Match Engine", () => {
  beforeEach(async () => {
    authState.userId = null;
    await resetDb();
  });

  it("creates a team-vs-team match through Side A / Side B", async () => {
    const organizer = await createUser("ORGANIZER");
    authState.userId = organizer.clerkId;
    const tournament = await createTournament(organizer.id);
    const [teamA, teamB] = await Promise.all([createTeam("Alpha"), createTeam("Beta")]);
    await db.tournamentTeam.createMany({
      data: [
        { tournamentId: tournament.id, teamId: teamA.id },
        { tournamentId: tournament.id, teamId: teamB.id },
      ],
    });

    const res = await POST(
      new Request("http://test/api/matches", {
        method: "POST",
        body: JSON.stringify({
          tournamentId: tournament.id,
          sport: "football",
          scoringAdapter: "goals",
          sides: [
            { key: "A", label: "Alpha", participants: [{ teamId: teamA.id }] },
            { key: "B", label: "Beta", participants: [{ teamId: teamB.id }] },
          ],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.match.sides).toHaveLength(2);
    expect(body.match.sides[0].participants[0].teamId).toBe(teamA.id);
    expect(body.match.playerOneId).toBeNull();
  });
});
