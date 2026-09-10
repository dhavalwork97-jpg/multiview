import type { Prisma, PrismaClient } from "@prisma/client";
import type { DynamicCompetitionConfig, CompetitionStageConfig } from "@/lib/dynamic-competition";
import { validateDynamicCompetition } from "@/lib/dynamic-competition";

type Tx = PrismaClient | Prisma.TransactionClient;

type Standing = {
  playerId: string;
  label: string;
  score: number;
  eliminations: number;
  wins: number;
  firstPlaces: number;
  matches: number;
  lastMatch: number;
};

function stageConfig(stage: { rules: unknown }): CompetitionStageConfig {
  const rules = stage.rules && typeof stage.rules === "object" && !Array.isArray(stage.rules)
    ? stage.rules as Record<string, unknown>
    : {};
  const config = {
    id: String(rules.id ?? "stage"),
    name: String(rules.name ?? "Battle Royale Stage"),
    order: Number(rules.order ?? 0),
    format: rules.format ?? "BATTLE_ROYALE_SESSION",
    session: rules.session ?? { mode: "FIXED_GAMES", games: 1 },
    scoring: rules.scoring ?? { placementPoints: [], eliminationPoints: 0, bonuses: {}, penalties: {} },
    advancement: rules.advancement ?? { method: "ALL", tieBreaker: [] },
    victory: rules.victory ?? { method: "HIGHEST_SCORE", requiresWinAfterThreshold: false },
    rules: {},
  };
  return validateDynamicCompetition({ version: 1, family: "BATTLE_ROYALE", stages: [config] }).stages[0];
}

function pointsForPlacement(stage: CompetitionStageConfig, place: number) {
  return stage.scoring.placementPoints.find((entry) => entry.place === place)?.points ?? 0;
}

async function calculateBattleRoyaleStandings(tx: Tx, stageId: string): Promise<Standing[]> {
  const matches = await tx.match.findMany({
    where: { stageId, status: "COMPLETED" },
    include: {
      sides: {
        include: { participants: { include: { player: true } }, scoreEvents: true },
      },
    },
    orderBy: { matchIndex: "asc" },
  });

  const map = new Map<string, Standing>();
  for (const match of matches) {
    for (const side of match.sides) {
      const participant = side.participants.find((item) => item.playerId)?.player;
      if (!participant) continue;
      const playerId = participant.id;
      const current = map.get(playerId) ?? {
        playerId,
        label: participant.gamertag,
        score: 0,
        eliminations: 0,
        wins: 0,
        firstPlaces: 0,
        matches: 0,
        lastMatch: match.matchIndex ?? 0,
      };
      let placement: number | null = null;
      let eliminations = 0;
      let directPoints = 0;
      for (const event of side.scoreEvents) {
        if (event.metric === "placement") placement = event.value;
        if (event.metric === "kills" || event.metric === "eliminations") eliminations += event.value;
        if (event.metric === "points") directPoints += event.value;
      }
      const matchPoints = directPoints + (placement ? pointsForPlacement(stageConfig({ rules: match.stage?.rules ?? {} }), placement) : 0) + eliminations * 1;
      current.score += matchPoints;
      current.eliminations += eliminations;
      current.wins += placement === 1 ? 1 : 0;
      current.firstPlaces += placement === 1 ? 1 : 0;
      current.matches += 1;
      current.lastMatch = match.matchIndex ?? current.lastMatch;
      map.set(playerId, current);
    }
  }
  return [...map.values()].sort((a, b) =>
    b.score - a.score || b.firstPlaces - a.firstPlaces || b.eliminations - a.eliminations || b.wins - a.wins || b.lastMatch - a.lastMatch || a.playerId.localeCompare(b.playerId)
  );
}

function qualifiedPlayers(standings: Standing[], stage: CompetitionStageConfig): Set<string> {
  const rule = stage.advancement;
  if (rule.method === "ALL") return new Set(standings.map((row) => row.playerId));
  if (rule.method === "TOP_PERCENT") {
    const count = Math.max(1, Math.ceil(standings.length * ((rule.value ?? 100) / 100)));
    return new Set(standings.slice(0, count).map((row) => row.playerId));
  }
  if (rule.method === "TOP_N") {
    return new Set(standings.slice(0, Math.max(0, rule.value ?? 0)).map((row) => row.playerId));
  }
  if (rule.method === "POINTS_THRESHOLD") return new Set(standings.filter((row) => row.score >= (rule.value ?? 0)).map((row) => row.playerId));
  if (rule.method === "WINS") return new Set(standings.filter((row) => row.wins >= (rule.value ?? 0)).map((row) => row.playerId));
  return new Set();
}

async function createStageLobbies(tx: Tx, tournamentId: string, stageId: string, playerIds: string[]) {
  const players = await tx.player.findMany({ where: { id: { in: playerIds } }, orderBy: { gamertag: "asc" } });
  const existing = await tx.match.count({ where: { stageId } });
  if (existing > 0 || players.length === 0) return [];
  const lobbyCount = Math.max(1, Math.ceil(players.length / 16));
  const lobbySize = Math.ceil(players.length / lobbyCount);
  const created = [];
  for (let lobbyIndex = 0; lobbyIndex < lobbyCount; lobbyIndex += 1) {
    const lobbyPlayers = players.slice(lobbyIndex * lobbySize, (lobbyIndex + 1) * lobbySize);
    if (!lobbyPlayers.length) continue;
    const match = await tx.match.create({
      data: {
        tournamentId,
        stageId,
        round: `Lobby ${lobbyIndex + 1}`,
        status: "QUEUED",
        roundIndex: lobbyIndex,
        matchIndex: lobbyIndex,
        scoringAdapter: "battle_royale",
        rulesSnapshot: { scoringAdapter: "battle_royale" },
      },
    });
    await tx.matchSide.createMany({ data: lobbyPlayers.map((player, index) => ({ matchId: match.id, sideKey: `P${index + 1}`, label: player.gamertag })) });
    const sides = await tx.matchSide.findMany({ where: { matchId: match.id }, orderBy: { sideKey: "asc" } });
    await tx.matchParticipant.createMany({ data: lobbyPlayers.map((player, index) => ({ sideId: sides[index].id, playerId: player.id })) });
    created.push(match.id);
  }
  return created;
}

export async function generateBattleRoyaleCompetition(tx: Tx, tournamentId: string, config: DynamicCompetitionConfig) {
  const stages = await tx.competitionStage.findMany({ where: { tournamentId }, orderBy: { orderIndex: "asc" } });
  if (!stages.length) return [];
  const entrants = await tx.tournamentEntrant.findMany({ where: { tournamentId, eliminated: false }, select: { playerId: true } });
  const firstStage = stages[0];
  return createStageLobbies(tx, tournamentId, firstStage.id, entrants.map((entry) => entry.playerId));
}

export async function progressBattleRoyaleStage(db: PrismaClient, matchId: string) {
  return db.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId }, select: { id: true, stageId: true, tournamentId: true, status: true } });
    if (!match?.stageId || match.status !== "COMPLETED") return { stageCompleted: false, advanced: [], standings: [] };
    const stage = await tx.competitionStage.findUnique({ where: { id: match.stageId } });
    if (!stage) return { stageCompleted: false, advanced: [], standings: [] };
    const cfg = stageConfig(stage);
    const stageMatches = await tx.match.findMany({ where: { stageId: stage.id }, select: { id: true, status: true } });
    const standings = await calculateBattleRoyaleStandings(tx, stage.id);
    const fixedGamesDone = cfg.session.mode === "FIXED_GAMES" && stageMatches.length > 0 && stageMatches.every((row) => row.status === "COMPLETED");
    const threshold = cfg.victory.threshold;
    const thresholdReached = threshold ? standings.some((row) => row.score >= threshold) : false;
    const stageComplete = fixedGamesDone || (cfg.session.mode === "UNTIL_THRESHOLD" && thresholdReached);
    if (!stageComplete) return { stageCompleted: false, advanced: [], standings };

    if (stage.status !== "COMPLETED") await tx.competitionStage.update({ where: { id: stage.id }, data: { status: "COMPLETED" } });
    const qualified = qualifiedPlayers(standings, cfg);
    await tx.tournamentEntrant.updateMany({ where: { tournamentId: match.tournamentId, playerId: { notIn: [...qualified] } }, data: { eliminated: true } });

    const allStages = await tx.competitionStage.findMany({ where: { tournamentId: match.tournamentId }, orderBy: { orderIndex: "asc" } });
    const nextStage = allStages.find((candidate) => candidate.orderIndex === stage.orderIndex + 1);
    let advanced: string[] = [];
    if (nextStage) {
      advanced = await createStageLobbies(tx, match.tournamentId, nextStage.id, [...qualified]);
      if (advanced.length && nextStage.status === "SCHEDULED") await tx.competitionStage.update({ where: { id: nextStage.id }, data: { status: "READY" } });
    } else {
      await tx.tournament.update({ where: { id: match.tournamentId }, data: { status: "COMPLETED", endDate: new Date() } });
    }
    const eventExists = await tx.progressionEvent.findFirst({ where: { matchId: match.id, eventType: "STAGE_COMPLETED" }, select: { id: true } });
    if (!eventExists) await tx.progressionEvent.create({ data: { tournamentId: match.tournamentId, matchId: match.id, eventType: "STAGE_COMPLETED", payload: { stageId: stage.id, qualifiedPlayerIds: [...qualified], standings } } });
    return { stageCompleted: true, advanced, standings, qualifiedPlayerIds: [...qualified], nextStageId: nextStage?.id ?? null };
  }, { timeout: 30_000 });
}

export async function getBattleRoyaleStandings(db: PrismaClient, tournamentId: string, stageId?: string) {
  const stage = stageId
    ? await db.competitionStage.findUnique({ where: { id: stageId } })
    : await db.competitionStage.findFirst({ where: { tournamentId }, orderBy: { orderIndex: "asc" } });
  if (!stage) return [];
  return calculateBattleRoyaleStandings(db, stage.id);
}
