import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  game: z.string().trim().min(2).max(80),
  startDate: z.string().datetime(),
  stationCount: z.number().int().min(1).max(64),
  players: z.array(z.string().trim().min(1).max(80)).min(2).max(64),
});

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return base || "tournament";
}

function roundName(roundIndex: number, totalRounds: number) {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return "Grand Final";
  if (remaining === 2) return "Semifinals";
  if (remaining === 3) return "Quarterfinals";
  return `Round ${roundIndex + 1}`;
}

/**
 * POST /api/tournaments
 *
 * Creates a complete admin-ready single-elimination tournament in one
 * transaction: tournament, entrants, stations, bracket structure and the
 * first-round Match rows. This deliberately does not depend on the demo
 * seed script, so tournaments created from the dashboard are real data.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const uniquePlayers = [...new Map(parsed.data.players.map((name) => [name.toLowerCase(), name])).values()];
  const playerCount = uniquePlayers.length;
  const isPowerOfTwo = (playerCount & (playerCount - 1)) === 0;
  if (!isPowerOfTwo) {
    return NextResponse.json(
      { error: "For automatic bracket generation, player count must be 2, 4, 8, 16, 32 or 64." },
      { status: 400 }
    );
  }

  const result = await db.$transaction(async (tx) => {
    const baseSlug = slugify(parsed.data.name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const tournament = await tx.tournament.create({
      data: {
        name: parsed.data.name,
        slug,
        game: parsed.data.game,
        status: "SCHEDULED",
        startDate: new Date(parsed.data.startDate),
        organizerId: user.id,
      },
    });

    const players = [];
    for (let index = 0; index < uniquePlayers.length; index += 1) {
      const gamertag = uniquePlayers[index];
      const player = await tx.player.upsert({
        where: { gamertag },
        update: {},
        create: { gamertag },
      });
      await tx.tournamentEntrant.create({
        data: { tournamentId: tournament.id, playerId: player.id, seed: index + 1 },
      });
      players.push(player);
    }

    const stationCount = Math.min(parsed.data.stationCount, Math.ceil(playerCount / 2));
    const stations = [];
    for (let index = 0; index < stationCount; index += 1) {
      stations.push(
        await tx.station.create({
          data: {
            tournamentId: tournament.id,
            label: `Station ${index + 1}`,
            status: "OFFLINE",
          },
        })
      );
    }

    const totalRounds = Math.log2(playerCount);
    const rounds = Array.from({ length: totalRounds }, (_, roundIndex) => ({
      name: roundName(roundIndex, totalRounds),
      matches: Array.from({ length: playerCount / 2 ** (roundIndex + 1) }, () => ({
        playerOneId: null as string | null,
        playerTwoId: null as string | null,
        round: roundName(roundIndex, totalRounds),
      })),
    }));

    for (let index = 0; index < playerCount / 2; index += 1) {
      rounds[0].matches[index].playerOneId = players[index * 2].id;
      rounds[0].matches[index].playerTwoId = players[index * 2 + 1].id;
    }

    const bracket = await tx.bracket.create({
      data: {
        tournamentId: tournament.id,
        name: "Winners Bracket",
        format: "single_elimination",
        structure: rounds,
      },
    });

    const firstRoundMatches = [];
    for (let index = 0; index < rounds[0].matches.length; index += 1) {
      const slot = rounds[0].matches[index];
      firstRoundMatches.push(
        await tx.match.create({
          data: {
            tournamentId: tournament.id,
            bracketId: bracket.id,
            stationId: stations[index % stations.length].id,
            playerOneId: slot.playerOneId!,
            playerTwoId: slot.playerTwoId!,
            round: slot.round,
            status: "QUEUED",
            roundIndex: 0,
            matchIndex: index,
          },
        })
      );
    }

    return {
      tournament: { id: tournament.id, name: tournament.name, slug: tournament.slug },
      bracket: { id: bracket.id, name: bracket.name },
      stationsCreated: stations.length,
      matchesCreated: firstRoundMatches.length,
      playersCreated: players.length,
    };
  });

  return NextResponse.json(result, { status: 201 });
}
