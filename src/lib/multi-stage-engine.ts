import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

type Entrant = { id: string; gamertag: string; seed: number | null };

type MatchRef = { id: string; stageId: string; roundIndex: number; matchIndex: number };

export type MultiStagePlan = {
  groupCount: number;
  qualifiersPerGroup: number;
  playoffEntrants: number;
  groups: Array<{ name: string; entrantIds: string[] }>;
  playoffRounds: number;
};

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)));
}

function chooseGroupCount(count: number) {
  if (count >= 13) return 4;
  if (count >= 8) return 2;
  return 1;
}

export function buildMultiStagePlan(entrants: Entrant[]): MultiStagePlan {
  const ordered = [...entrants].sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER));
  const groupCount = chooseGroupCount(ordered.length);
  const groups = Array.from({ length: groupCount }, (_, index) => ({ name: `Group ${String.fromCharCode(65 + index)}`, entrantIds: [] as string[] }));

  // Snake distribution keeps seeded entrants apart while preserving seed order.
  ordered.forEach((entrant, index) => {
    const cycle = Math.floor(index / groupCount);
    const offset = cycle % 2 === 0 ? index % groupCount : groupCount - 1 - (index % groupCount);
    groups[offset].entrantIds.push(entrant.id);
  });

  const qualifiersPerGroup = groupCount === 1
    ? (ordered.length >= 4 ? 4 : 2)
    : 2;

  const playoffEntrants = Math.min(
    ordered.length,
    Math.max(2, groups.reduce((sum, group) => sum + Math.min(qualifiersPerGroup, group.entrantIds.length), 0)),
  );
  const playoffSize = nextPowerOfTwo(playoffEntrants);
  const playoffRounds = Math.log2(playoffSize);

  return { groupCount, qualifiersPerGroup, playoffEntrants, groups, playoffRounds };
}

async function createTwoSideMatch(tx: Tx, data: { tournamentId: string; stageId: string; round: string; roundIndex: number; matchIndex: number; stationId?: string | null }) {
  const match = await tx.match.create({
    data: {
      tournamentId: data.tournamentId,
      stageId: data.stageId,
      stationId: data.stationId ?? null,
      round: data.round,
      roundIndex: data.roundIndex,
      matchIndex: data.matchIndex,
      status: "QUEUED",
      scoringAdapter: "points",
    },
  });
  await tx.matchSide.createMany({ data: [
    { matchId: match.id, sideKey: "A" },
    { matchId: match.id, sideKey: "B" },
  ] });
  return match;
}

async function seedSide(tx: Tx, matchId: string, sideKey: string, playerId: string) {
  const side = await tx.matchSide.findUnique({ where: { matchId_sideKey: { matchId, sideKey } } });
  if (!side) throw new Error(`Missing ${sideKey} on match ${matchId}`);
  await tx.matchParticipant.create({ data: { sideId: side.id, playerId } });
}

export async function generateMultiStageTournament(tx: Tx, tournamentId: string) {
  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, format: true, sport: true, scoringMode: true, competitionRules: true },
  });
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.scoringMode === "battle_royale" || tournament.sport === "bgmi") {
    throw new Error("Battle Royale tournaments use lobbies and standings, not multi-stage brackets");
  }
  if (tournament.format !== "SINGLE_ELIMINATION") {
    throw new Error("v31.8 multi-stage automation currently supports Single Elimination playoff stages");
  }

  const existingStages = await tx.competitionStage.count({ where: { tournamentId } });
  const existingMatches = await tx.match.count({ where: { tournamentId } });
  if (existingStages > 0 || existingMatches > 0) {
    throw new Error("Tournament already has competition stages or matches");
  }

  const entrants = await tx.tournamentEntrant.findMany({
    where: { tournamentId },
    orderBy: { seed: "asc" },
    select: { id: true, playerId: true, seed: true },
  });
  if (entrants.length < 4) throw new Error("Multi-stage tournaments require at least 4 entrants");

  const players = await tx.player.findMany({
    where: { id: { in: entrants.map((entrant) => entrant.playerId) } },
    select: { id: true, gamertag: true },
  });
  const playersById = new Map(players.map((player) => [player.id, player]));
  const normalizedEntrants: Entrant[] = entrants
    .map((entrant) => {
      const player = playersById.get(entrant.playerId);
      return player ? { id: player.id, gamertag: player.gamertag, seed: entrant.seed } : null;
    })
    .filter((entrant): entrant is Entrant => entrant !== null);
  if (normalizedEntrants.length < 4) throw new Error("Multi-stage tournaments require at least 4 valid player entrants");
  const plan = buildMultiStagePlan(normalizedEntrants);
  const rules = (tournament.competitionRules && typeof tournament.competitionRules === "object" && !Array.isArray(tournament.competitionRules))
    ? tournament.competitionRules as Record<string, unknown>
    : {};

  const stages: Array<{ id: string; name: string; kind: "GROUP" | "KNOCKOUT" | "FINAL" }> = [];
  const groupStageIds: string[] = [];

  for (let groupIndex = 0; groupIndex < plan.groups.length; groupIndex += 1) {
    const group = plan.groups[groupIndex];
    const stage = await tx.competitionStage.create({
      data: {
        tournamentId,
        name: `${group.name} · League Stage`,
        kind: "GROUP",
        orderIndex: groupIndex,
        status: "SCHEDULED",
        rules: { ...rules, stageRole: "GROUP", groupName: group.name, groupIndex, groupCount: plan.groupCount, qualifiers: Math.min(plan.qualifiersPerGroup, group.entrantIds.length), engine: "fgc-v31.8" } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    stages.push({ id: stage.id, name: group.name, kind: "GROUP" });
    groupStageIds.push(stage.id);

    for (let i = 0; i < group.entrantIds.length; i += 1) {
      for (let j = i + 1; j < group.entrantIds.length; j += 1) {
        const match = await createTwoSideMatch(tx, {
          tournamentId,
          stageId: stage.id,
          round: `${group.name} Round Robin`,
          roundIndex: 0,
          matchIndex: i * group.entrantIds.length + j,
        });
        await seedSide(tx, match.id, "A", group.entrantIds[i]);
        await seedSide(tx, match.id, "B", group.entrantIds[j]);
      }
    }
  }

  const playoffStage = await tx.competitionStage.create({
    data: {
      tournamentId,
      name: "Playoffs",
      kind: "KNOCKOUT",
      orderIndex: plan.groupCount,
      status: "SCHEDULED",
      rules: { ...rules, stageRole: "PLAYOFFS", qualifiers: plan.playoffEntrants, engine: "fgc-v31.8" } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  stages.push({ id: playoffStage.id, name: "Playoffs", kind: "KNOCKOUT" });

  const finalStage = await tx.competitionStage.create({
    data: {
      tournamentId,
      name: "Grand Final",
      kind: "FINAL",
      orderIndex: plan.groupCount + 1,
      status: "SCHEDULED",
      rules: { ...rules, stageRole: "FINAL", engine: "fgc-v31.8" } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  stages.push({ id: finalStage.id, name: "Grand Final", kind: "FINAL" });

  const qualifierSources: Array<{ stageId: string; rank: number }> = [];
  for (let rank = 1; rank <= plan.qualifiersPerGroup; rank += 1) {
    for (const stageId of groupStageIds) {
      const group = plan.groups[groupStageIds.indexOf(stageId)];
      if (rank <= group.entrantIds.length) qualifierSources.push({ stageId, rank });
    }
  }

  const playoffSize = nextPowerOfTwo(plan.playoffEntrants);
  const playoffRoundCount = Math.max(0, Math.log2(playoffSize) - 1);
  const playoffMatches: MatchRef[][] = [];
  for (let roundIndex = 0; roundIndex < playoffRoundCount; roundIndex += 1) {
    const count = playoffSize / 2 ** (roundIndex + 1);
    const roundMatches: MatchRef[] = [];
    for (let matchIndex = 0; matchIndex < count; matchIndex += 1) {
      const match = await createTwoSideMatch(tx, {
        tournamentId,
        stageId: playoffStage.id,
        round: roundIndex === playoffRoundCount - 1 ? "Playoff Final" : `Playoff Round ${roundIndex + 1}`,
        roundIndex,
        matchIndex,
      });
      roundMatches.push({ id: match.id, stageId: playoffStage.id, roundIndex, matchIndex });
    }
    playoffMatches.push(roundMatches);
  }

  // First playoff round receives group rankings. The playoff stage stops one
  // round before the championship; the separate Grand Final stage receives
  // the final playoff winner(s).
  if (playoffMatches.length > 0) {
    const firstRound = playoffMatches[0];
    const seeds = qualifierSources.slice(0, plan.playoffEntrants);
    for (let i = 0; i < firstRound.length; i += 1) {
      const left = seeds[i * 2];
      const right = seeds[i * 2 + 1];
      if (left) await tx.advancementSlot.create({ data: { sourceType: "STAGE_RANK", outcome: "RANK", sourceStageId: left.stageId, sourceRank: left.rank, targetMatchId: firstRound[i].id, targetSideKey: "A", sourceLabel: `Qualifier ${left.rank}` } });
      if (right) await tx.advancementSlot.create({ data: { sourceType: "STAGE_RANK", outcome: "RANK", sourceStageId: right.stageId, sourceRank: right.rank, targetMatchId: firstRound[i].id, targetSideKey: "B", sourceLabel: `Qualifier ${right.rank}` } });
    }

    for (let roundIndex = 1; roundIndex < playoffMatches.length; roundIndex += 1) {
      const previous = playoffMatches[roundIndex - 1];
      for (let matchIndex = 0; matchIndex < playoffMatches[roundIndex].length; matchIndex += 1) {
        const target = playoffMatches[roundIndex][matchIndex];
        const sourceA = previous[matchIndex * 2];
        const sourceB = previous[matchIndex * 2 + 1];
        if (sourceA) await tx.advancementSlot.create({ data: { sourceType: "MATCH_RESULT", outcome: "WINNER", sourceMatchId: sourceA.id, targetMatchId: target.id, targetSideKey: "A", sourceLabel: `Winner of playoff ${sourceA.matchIndex + 1}` } });
        if (sourceB) await tx.advancementSlot.create({ data: { sourceType: "MATCH_RESULT", outcome: "WINNER", sourceMatchId: sourceB.id, targetMatchId: target.id, targetSideKey: "B", sourceLabel: `Winner of playoff ${sourceB.matchIndex + 1}` } });
      }
    }
  }

  const finalMatch = await createTwoSideMatch(tx, { tournamentId, stageId: finalStage.id, round: "Grand Final", roundIndex: 0, matchIndex: 0 });
  if (playoffMatches.length > 0) {
    const lastPlayoffRound = playoffMatches[playoffMatches.length - 1];
    if (lastPlayoffRound.length === 1) {
      await tx.advancementSlot.create({ data: { sourceType: "MATCH_RESULT", outcome: "WINNER", sourceMatchId: lastPlayoffRound[0].id, targetMatchId: finalMatch.id, targetSideKey: "A", sourceLabel: "Playoff winner" } });
      // A single-match playoff stage (two qualifiers) feeds both finalists
      // only when a dedicated final is requested; seed the other finalist from
      // the second group qualifier for a two-team playoff path.
      const fallback = qualifierSources[1];
      if (fallback) await tx.advancementSlot.create({ data: { sourceType: "STAGE_RANK", outcome: "RANK", sourceStageId: fallback.stageId, sourceRank: fallback.rank, targetMatchId: finalMatch.id, targetSideKey: "B", sourceLabel: "Finalist qualifier" } });
    } else {
      await tx.advancementSlot.create({ data: { sourceType: "MATCH_RESULT", outcome: "WINNER", sourceMatchId: lastPlayoffRound[0].id, targetMatchId: finalMatch.id, targetSideKey: "A", sourceLabel: "Playoff finalist A" } });
      await tx.advancementSlot.create({ data: { sourceType: "MATCH_RESULT", outcome: "WINNER", sourceMatchId: lastPlayoffRound[1].id, targetMatchId: finalMatch.id, targetSideKey: "B", sourceLabel: "Playoff finalist B" } });
    }
  } else {
    const left = qualifierSources[0];
    const right = qualifierSources[1];
    if (left) await tx.advancementSlot.create({ data: { sourceType: "STAGE_RANK", outcome: "RANK", sourceStageId: left.stageId, sourceRank: left.rank, targetMatchId: finalMatch.id, targetSideKey: "A", sourceLabel: "Finalist A" } });
    if (right) await tx.advancementSlot.create({ data: { sourceType: "STAGE_RANK", outcome: "RANK", sourceStageId: right.stageId, sourceRank: right.rank, targetMatchId: finalMatch.id, targetSideKey: "B", sourceLabel: "Finalist B" } });
  }

  // The playoff bracket itself is represented by stage matches. No Bracket row
  // is created, so the multi-stage UI can distinguish it from legacy bracket-only tournaments.
  return { plan, stages, playoffMatches, finalMatchId: finalMatch.id };
}
