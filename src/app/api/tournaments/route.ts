import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { getOrCreatePersonalOrganization, requirePrimaryOrganizationRole } from "@/lib/organization";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import {
  getCompetitionPreset,
  normalizeRules,
} from "@/lib/competition-engine";

const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  game: z.string().trim().min(2).max(80),
  sport: z.string().trim().min(2).max(40).default("esports"),
  competitionType: z.string().trim().min(2).max(40).default("tournament"),
  participantMode: z.enum(["individual", "team", "pair", "mixed"]).default("individual"),
  scoringMode: z.string().trim().min(2).max(40).optional(),
  competitionRules: z.record(z.unknown()).optional(),
  startDate: z.string().datetime(),
  stationCount: z.number().int().min(1).max(64),
  players: z.array(z.string().trim().min(1).max(80)).min(2).max(64),
  format: z.enum(["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "SWISS"]).default("SINGLE_ELIMINATION"),
  bestOf: z.number().int().min(1).max(9).optional(),
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
 * Creates a complete admin-ready competition in one transaction.
 * Bracket-based formats get bracket structure and match rows; Battle Royale
 * gets a standings-driven stage without a bracket. This deliberately does not
 * depend on the demo seed script, so tournaments created from the dashboard
 * are real data.
 */
export async function POST(req: Request) {
  let user;
  try {
    ({ user } = await requirePrimaryOrganizationRole("ADMIN"));
  } catch {
    return NextResponse.json({ error: "Only organization admins can create tournaments" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(body);
    if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const preset = getCompetitionPreset(parsed.data.sport);

  const requestedCompetitionType =
    parsed.data.competitionType || preset.competitionType;

  const participantMode =
    parsed.data.participantMode || preset.participantMode;

  const requestedScoringMode = parsed.data.scoringMode || preset.scoringAdapter;
  const bestOf = parsed.data.bestOf || preset.bestOf;

  // Battle Royale competitions are standings-driven, not bracket-driven.
  // BGMI always normalizes to the BR adapter so an API caller cannot create
  // a BR event with an incompatible scoring engine or bracket format.
  const isBattleRoyale =
    parsed.data.sport === "bgmi" || requestedScoringMode === "battle_royale";
  const scoringMode = isBattleRoyale ? "battle_royale" : requestedScoringMode;
  const competitionType = isBattleRoyale ? "league" : requestedCompetitionType;

  const competitionRules = normalizeRules(
    parsed.data.sport,
    scoringMode,
    bestOf,
    parsed.data.competitionRules,
  );


  const uniquePlayers = [...new Map(parsed.data.players.map((name) => [name.toLowerCase(), name])).values()];
  const playerCount = uniquePlayers.length;
  if (playerCount < 2 || playerCount > 64) {
    return NextResponse.json({ error: "Enter between 2 and 64 competitors." }, { status: 400 });
  }

  const isKnockout = !isBattleRoyale &&
    (parsed.data.format === "SINGLE_ELIMINATION" || parsed.data.format === "DOUBLE_ELIMINATION");
  const isLeague = !isBattleRoyale && parsed.data.format === "ROUND_ROBIN";
  const isSwiss = !isBattleRoyale && parsed.data.format === "SWISS";

  const organization = await getOrCreatePersonalOrganization(user.id);
  const currentTournamentCount = await db.tournament.count({ where: { organizationId: organization.id, status: { not: "ARCHIVED" } } });
  const planLimit = PLAN_LIMITS[organization.plan].tournaments;
  if (currentTournamentCount >= planLimit) return NextResponse.json({ error: `Your ${organization.plan} plan allows ${planLimit} active tournaments. Upgrade to create another.` }, { status: 402 });

  const result = await db.$transaction(async (tx) => {
    const baseSlug = slugify(parsed.data.name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const tournament = await tx.tournament.create({
      data: {
        name: parsed.data.name,
        slug,
        game: parsed.data.game,
        sport: parsed.data.sport,
        competitionType,
        participantMode,
        scoringMode,
        competitionRules: competitionRules as any,
        status: "SCHEDULED",
        startDate: new Date(parsed.data.startDate),
        organizerId: user.id,
        organizationId: organization.id,
        format: parsed.data.format,
        bestOf,
      },
    });

    const players: Array<{ id: string; gamertag: string }> = [];
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

    let bracketStructure: any[] = [];
    let firstRoundMatches: any[] = [];

    if (isLeague) {
      const schedule: Array<(typeof players)[number] | null> = [...players];
      if (schedule.length % 2 !== 0) schedule.push(null);
      const roundCount = schedule.length - 1;
      const matchesPerRound = schedule.length / 2;
      bracketStructure = Array.from({ length: roundCount }, (_, roundIndex) => ({
        name: `Round ${roundIndex + 1}`,
        matches: [],
      }));
      const rotation = [...schedule];
      for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
        for (let i = 0; i < matchesPerRound; i += 1) {
          const a = rotation[i];
          const b = rotation[rotation.length - 1 - i];
          if (!a || !b) continue;
          bracketStructure[roundIndex].matches.push({
            playerOneId: a.id, playerTwoId: b.id, round: `Round ${roundIndex + 1}`,
          });
        }
        const fixed = rotation[0];
        const rest = rotation.slice(1);
        rest.unshift(rest.pop()!);
        rotation.splice(0, rotation.length, fixed, ...rest);
      }
    } else if (isSwiss) {
      // Swiss pairings are result-driven. Seed round one only; later rounds are
      // generated from standings by the organizer instead of being a bracket.
      bracketStructure = [{
        name: "Swiss Round 1",
        matches: Array.from({ length: Math.floor(playerCount / 2) }, (_, index) => ({
          playerOneId: players[index * 2]?.id ?? null,
          playerTwoId: players[index * 2 + 1]?.id ?? null,
          round: "Swiss Round 1",
        })),
      }];
    } else if (isKnockout) {
      const bracketSize = 2 ** Math.ceil(Math.log2(playerCount));
      const totalRounds = Math.log2(bracketSize);
      bracketStructure = Array.from({ length: totalRounds }, (_, roundIndex) => ({
        name: roundName(roundIndex, totalRounds),
        matches: Array.from({ length: bracketSize / 2 ** (roundIndex + 1) }, () => ({
          playerOneId: null as string | null,
          playerTwoId: null as string | null,
          round: roundName(roundIndex, totalRounds),
        })),
      }));
      for (let index = 0; index < bracketSize / 2; index += 1) {
        bracketStructure[0].matches[index].playerOneId = players[index * 2]?.id ?? null;
        bracketStructure[0].matches[index].playerTwoId = players[index * 2 + 1]?.id ?? null;
      }
    }

    const stage = await tx.competitionStage.create({
      data: {
        tournamentId: tournament.id,
        name: isBattleRoyale
          ? "Battle Royale · Lobbies & Standings"
          : isLeague
            ? "League Stage"
            : isSwiss
              ? "Swiss Stage"
              : "Main Stage",
        kind: isBattleRoyale
          ? "LEAGUE"
          : isLeague
            ? "LEAGUE"
            : isSwiss
              ? "SWISS"
              : isKnockout
                ? "KNOCKOUT"
                : "CUSTOM",
        orderIndex: 0,
        rules: competitionRules as any,
      },
    });

    let bracket: { id: string; name: string } | null = null;

    if (isKnockout) {
      const createdBracket = await tx.bracket.create({
        data: {
          tournamentId: tournament.id,
          name: parsed.data.format === "DOUBLE_ELIMINATION" ? "Double Elimination" : "Winners Bracket",
          format: parsed.data.format.toLowerCase(),
          structure: bracketStructure,
        },
        select: { id: true, name: true },
      });
      bracket = createdBracket;

      const createdMatches = new Map<string, string>();
      for (let roundIndex = 0; roundIndex < bracketStructure.length; roundIndex += 1) {
        for (let index = 0; index < bracketStructure[roundIndex].matches.length; index += 1) {
          const slot = bracketStructure[roundIndex].matches[index];
          const isInitialMatch = Boolean(slot.playerOneId && slot.playerTwoId);
          const match = await tx.match.create({
            data: {
              tournamentId: tournament.id, bracketId: createdBracket.id, stageId: stage.id,
              stationId: isInitialMatch && stations.length > 0 ? stations[firstRoundMatches.length % stations.length].id : null,
              playerOneId: slot.playerOneId ?? null, playerTwoId: slot.playerTwoId ?? null,
              round: slot.round, status: "QUEUED", roundIndex, matchIndex: index,
              scoringAdapter: scoringMode, rulesSnapshot: competitionRules as any,
            },
          });
          await tx.matchSide.createMany({ data: [
            { matchId: match.id, sideKey: "A", label: "Side A" },
            { matchId: match.id, sideKey: "B", label: "Side B" },
          ] });
          const sides = await tx.matchSide.findMany({ where: { matchId: match.id }, orderBy: { sideKey: "asc" } });
          const participants = [];
          if (slot.playerOneId) participants.push({ sideId: sides[0].id, playerId: slot.playerOneId });
          if (slot.playerTwoId) participants.push({ sideId: sides[1].id, playerId: slot.playerTwoId });
          if (participants.length) await tx.matchParticipant.createMany({ data: participants });
          createdMatches.set(`${roundIndex}:${index}`, match.id);
          if (isInitialMatch) firstRoundMatches.push(match);
        }
      }
      for (let roundIndex = 0; roundIndex < bracketStructure.length - 1; roundIndex += 1) {
        for (let index = 0; index < bracketStructure[roundIndex].matches.length; index += 1) {
          const sourceMatchId = createdMatches.get(`${roundIndex}:${index}`);
          const targetMatchId = createdMatches.get(`${roundIndex + 1}:${Math.floor(index / 2)}`);
          if (!sourceMatchId || !targetMatchId) throw new Error(`Invalid generated bracket topology at round ${roundIndex}, match ${index}`);
          await tx.advancementSlot.create({
            data: { sourceType: "MATCH_RESULT", outcome: "WINNER", sourceMatchId, targetMatchId,
              targetSideKey: index % 2 === 0 ? "A" : "B", sourceLabel: `Winner of ${bracketStructure[roundIndex].matches[index].round}` },
          });
        }
      }
    } else if (isLeague || isSwiss) {
      // League/Swiss are fixture-table competitions: no Bracket row is created.
      const fixtures = bracketStructure.flatMap((round, roundIndex) =>
        round.matches.map((slot: any, matchIndex: number) => ({ ...slot, roundIndex, matchIndex }))
      );
      for (const slot of fixtures) {
        if (!slot.playerOneId || !slot.playerTwoId) continue;
        const match = await tx.match.create({
          data: { tournamentId: tournament.id, stageId: stage.id,
            stationId: stations.length ? stations[firstRoundMatches.length % stations.length].id : null,
            playerOneId: slot.playerOneId, playerTwoId: slot.playerTwoId, round: slot.round, status: "QUEUED",
            roundIndex: slot.roundIndex, matchIndex: slot.matchIndex, scoringAdapter: scoringMode, rulesSnapshot: competitionRules as any },
        });
        await tx.matchSide.createMany({ data: [
          { matchId: match.id, sideKey: "A", label: "Side A" }, { matchId: match.id, sideKey: "B", label: "Side B" },
        ] });
        const sides = await tx.matchSide.findMany({ where: { matchId: match.id }, orderBy: { sideKey: "asc" } });
        await tx.matchParticipant.createMany({ data: [
          { sideId: sides[0].id, playerId: slot.playerOneId }, { sideId: sides[1].id, playerId: slot.playerTwoId },
        ] });
        firstRoundMatches.push(match);
      }
    } else if (isBattleRoyale) {
      // A BR lobby is one match with one side per entrant. Side keys are A.. and
      // the generic standings engine aggregates placement/kills/points by side.
      const lobbyCount = Math.max(1, Math.ceil(playerCount / 16));
      const lobbySize = Math.ceil(playerCount / lobbyCount);
      for (let lobbyIndex = 0; lobbyIndex < lobbyCount; lobbyIndex += 1) {
        const lobbyPlayers = players.slice(lobbyIndex * lobbySize, (lobbyIndex + 1) * lobbySize);
        if (!lobbyPlayers.length) continue;
        const match = await tx.match.create({
          data: { tournamentId: tournament.id, stageId: stage.id,
            stationId: stations.length ? stations[lobbyIndex % stations.length].id : null,
            round: `Lobby ${lobbyIndex + 1}`, status: "QUEUED", roundIndex: lobbyIndex, matchIndex: lobbyIndex,
            scoringAdapter: "battle_royale", rulesSnapshot: competitionRules as any },
        });
        const sideData = lobbyPlayers.map((player, index) => ({
          matchId: match.id, sideKey: `P${index + 1}`, label: player.gamertag,
        }));
        await tx.matchSide.createMany({ data: sideData });
        const sides = await tx.matchSide.findMany({ where: { matchId: match.id }, orderBy: { sideKey: "asc" } });
        await tx.matchParticipant.createMany({ data: lobbyPlayers.map((player, index) => ({ sideId: sides[index].id, playerId: player.id })) });
        firstRoundMatches.push(match);
      }
    }

    return {
      tournament: { id: tournament.id, name: tournament.name, slug: tournament.slug },
      bracket,
      stage: { id: stage.id, name: stage.name },
      stationsCreated: stations.length,
      matchesCreated: firstRoundMatches.length,
      playersCreated: players.length,
    };
  });

  await writeAuditLog({
    tournamentId: result.tournament.id,
    actorUserId: user.id,
    action: "TOURNAMENT_CREATED",
    entityType: "tournament",
    entityId: result.tournament.id,
    metadata: {
      name: result.tournament.name,
      game: parsed.data.game,
      stationsCreated: result.stationsCreated,
      matchesCreated: result.matchesCreated,
      playersCreated: result.playersCreated,
    },
  });

  return NextResponse.json(result, { status: 201 });
}
