import type { Prisma, PrismaClient } from "@prisma/client";
import type { DynamicCompetitionConfig, CompetitionStageConfig } from "@/lib/dynamic-competition";
import { validateDynamicCompetition } from "@/lib/dynamic-competition";

type Tx = PrismaClient | Prisma.TransactionClient;

type Standing = {
  playerId: string; label: string; score: number; eliminations: number;
  wins: number; firstPlaces: number; matches: number; lastMatch: number;
};

function stageConfig(stage: { rules: unknown }): CompetitionStageConfig {
  const rules = stage.rules && typeof stage.rules === "object" && !Array.isArray(stage.rules) ? stage.rules as Record<string, unknown> : {};
  return validateDynamicCompetition({ version: 1, family: "BATTLE_ROYALE", stages: [{
    id: String(rules.id ?? "stage"), name: String(rules.name ?? "Battle Royale Stage"), order: Number(rules.order ?? 0),
    format: rules.format ?? "BATTLE_ROYALE_SESSION", session: rules.session ?? { mode: "FIXED_GAMES", games: 1 },
    scoring: rules.scoring ?? { placementPoints: [], eliminationPoints: 0, bonuses: {}, penalties: {} },
    advancement: rules.advancement ?? { method: "ALL", tieBreaker: [] },
    victory: rules.victory ?? { method: "HIGHEST_SCORE", requiresWinAfterThreshold: false }, rules: {},
  }] }).stages[0];
}

function placementPoints(stage: CompetitionStageConfig, place: number) {
  return stage.scoring.placementPoints.find((entry) => entry.place === place)?.points ?? 0;
}

function sideMatchScore(stage: CompetitionStageConfig, side: { scoreEvents: Array<{ metric: string; value: number }> }) {
  let placement: number | null = null;
  let eliminations = 0;
  let directPoints = 0;
  for (const event of side.scoreEvents) {
    if (event.metric === "placement") placement = event.value;
    if (event.metric === "kills" || event.metric === "eliminations") eliminations += event.value;
    if (event.metric === "points") directPoints += event.value;
  }
  return {
    placement,
    eliminations,
    points: directPoints + (placement ? placementPoints(stage, placement) : 0) + eliminations * stage.scoring.eliminationPoints,
  };
}

async function calculateBattleRoyaleStandings(tx: Tx, stageId: string, cfg: CompetitionStageConfig): Promise<Standing[]> {
  const matches = await tx.match.findMany({ where: { stageId, status: "COMPLETED" }, include: { sides: { include: { participants: { include: { player: true } }, scoreEvents: true } } }, orderBy: { matchIndex: "asc" } });
  const map = new Map<string, Standing>();
  for (const match of matches) for (const side of match.sides) {
    const participant = side.participants.find((item) => item.playerId)?.player;
    if (!participant) continue;
    const current = map.get(participant.id) ?? { playerId: participant.id, label: participant.gamertag, score: 0, eliminations: 0, wins: 0, firstPlaces: 0, matches: 0, lastMatch: match.matchIndex ?? 0 };
    const result = sideMatchScore(cfg, side);
    current.score += result.points;
    current.eliminations += result.eliminations; current.wins += result.placement === 1 ? 1 : 0; current.firstPlaces += result.placement === 1 ? 1 : 0;
    current.matches += 1; current.lastMatch = match.matchIndex ?? current.lastMatch; map.set(participant.id, current);
  }
  return [...map.values()].sort((a, b) => b.score - a.score || b.firstPlaces - a.firstPlaces || b.eliminations - a.eliminations || b.wins - a.wins || b.lastMatch - a.lastMatch || a.playerId.localeCompare(b.playerId));
}

async function findMatchPointWinner(tx: Tx, stageId: string, cfg: CompetitionStageConfig): Promise<string | null> {
  const threshold = cfg.victory.threshold;
  if (!threshold || !cfg.victory.requiresWinAfterThreshold) return null;

  const matches = await tx.match.findMany({
    where: { stageId, status: "COMPLETED" },
    include: { sides: { include: { participants: true, scoreEvents: true } } },
    orderBy: [{ matchIndex: "asc" }, { id: "asc" }],
  });
  const totals = new Map<string, number>();

  for (const match of matches) {
    const results = match.sides.map((side) => ({
      playerId: side.participants.find((participant) => participant.playerId)?.playerId ?? null,
      result: sideMatchScore(cfg, side),
    })).filter((entry): entry is { playerId: string; result: ReturnType<typeof sideMatchScore> } => Boolean(entry.playerId));

    for (const entry of results) {
      const beforeMatchScore = totals.get(entry.playerId) ?? 0;
      if (beforeMatchScore >= threshold && entry.result.placement === 1) return entry.playerId;
    }

    for (const entry of results) {
      totals.set(entry.playerId, (totals.get(entry.playerId) ?? 0) + entry.result.points);
    }
  }

  return null;
}

function qualifiedPlayers(standings: Standing[], stage: CompetitionStageConfig): Set<string> {
  const rule = stage.advancement;
  if (rule.method === "ALL") return new Set(standings.map((row) => row.playerId));
  if (rule.method === "TOP_PERCENT") return new Set(standings.slice(0, Math.max(1, Math.ceil(standings.length * ((rule.value ?? 100) / 100)))).map((row) => row.playerId));
  if (rule.method === "TOP_N") return new Set(standings.slice(0, Math.max(0, rule.value ?? 0)).map((row) => row.playerId));
  if (rule.method === "POINTS_THRESHOLD") return new Set(standings.filter((row) => row.score >= (rule.value ?? 0)).map((row) => row.playerId));
  if (rule.method === "WINS") return new Set(standings.filter((row) => row.wins >= (rule.value ?? 0)).map((row) => row.playerId));
  return new Set();
}

async function createStageLobbies(tx: Tx, tournamentId: string, stageId: string, playerIds: string[], cfg: CompetitionStageConfig, appendBatch = false) {
  const players = await tx.player.findMany({ where: { id: { in: playerIds } } });
  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = playerIds.map((id) => byId.get(id)).filter((player): player is typeof players[number] => Boolean(player));
  if (!ordered.length) return [];
  if (!appendBatch && await tx.match.count({ where: { stageId } })) return [];
  const lobbyCount = Math.max(1, Math.ceil(ordered.length / 16));
  const lobbySize = Math.ceil(ordered.length / lobbyCount);
  const existing = await tx.match.count({ where: { stageId } });
  const games = cfg.session.mode === "FIXED_GAMES" ? cfg.session.games ?? 1 : 1;
  const created: string[] = [];
  for (let gameIndex = 0; gameIndex < games; gameIndex += 1) for (let lobbyIndex = 0; lobbyIndex < lobbyCount; lobbyIndex += 1) {
    const lobbyPlayers = ordered.slice(lobbyIndex * lobbySize, (lobbyIndex + 1) * lobbySize);
    if (!lobbyPlayers.length) continue;
    const matchIndex = existing + gameIndex * lobbyCount + lobbyIndex;
    const match = await tx.match.create({ data: {
      tournamentId, stageId, round: `Game ${gameIndex + 1} · Lobby ${lobbyIndex + 1}`, status: "QUEUED",
      roundIndex: gameIndex, matchIndex, scoringAdapter: "battle_royale", rulesSnapshot: { scoringAdapter: "battle_royale", game: gameIndex + 1 },
    } });
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
  const entrants = await tx.tournamentEntrant.findMany({ where: { tournamentId, eliminated: false }, orderBy: { seed: "asc" }, select: { playerId: true } });
  return createStageLobbies(tx, tournamentId, stages[0].id, entrants.map((entry) => entry.playerId), config.stages[0]);
}

export async function progressBattleRoyaleStage(db: PrismaClient, matchId: string) {
  return db.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId }, select: { id: true, stageId: true, tournamentId: true, status: true } });
    if (!match?.stageId || match.status !== "COMPLETED") return { stageCompleted: false, advanced: [], standings: [] };
    const stage = await tx.competitionStage.findUnique({ where: { id: match.stageId } });
    if (!stage) return { stageCompleted: false, advanced: [], standings: [] };
    const cfg = stageConfig(stage);
    const stageMatches = await tx.match.findMany({ where: { stageId: stage.id }, select: { id: true, status: true } });
    const standings = await calculateBattleRoyaleStandings(tx, stage.id, cfg);
    const allComplete = stageMatches.length > 0 && stageMatches.every((row) => row.status === "COMPLETED");
    const thresholdReached = cfg.victory.threshold ? standings.some((row) => row.score >= cfg.victory.threshold!) : false;
    const matchPointWinner = thresholdReached && cfg.victory.requiresWinAfterThreshold
      ? await findMatchPointWinner(tx, stage.id, cfg)
      : null;
    const victoryReached = thresholdReached && (!cfg.victory.requiresWinAfterThreshold || Boolean(matchPointWinner));

    if (cfg.session.mode === "UNTIL_THRESHOLD" && !victoryReached) {
      if (allComplete) {
        const entrants = standings.map((row) => row.playerId);
        const nextLobbies = await createStageLobbies(tx, match.tournamentId, stage.id, entrants, cfg, true);
        return { stageCompleted: false, advanced: nextLobbies, standings, nextBatch: true, matchPointWinner: null };
      }
      return { stageCompleted: false, advanced: [], standings, matchPointWinner: null };
    }
    if (cfg.session.mode === "FIXED_GAMES" && !allComplete) return { stageCompleted: false, advanced: [], standings, matchPointWinner: null };
    if (stage.status !== "COMPLETED") await tx.competitionStage.update({ where: { id: stage.id }, data: { status: "COMPLETED" } });
    const qualified = qualifiedPlayers(standings, cfg);
    if (qualified.size > 0) await tx.tournamentEntrant.updateMany({ where: { tournamentId: match.tournamentId, playerId: { notIn: [...qualified] } }, data: { eliminated: true } });
    const allStages = await tx.competitionStage.findMany({ where: { tournamentId: match.tournamentId }, orderBy: { orderIndex: "asc" } });
    const nextStage = allStages.find((candidate) => candidate.orderIndex === stage.orderIndex + 1);
    let advanced: string[] = [];
    if (nextStage) {
      const nextCfg = stageConfig(nextStage);
      const qualifiedIds = standings.filter((row) => qualified.has(row.playerId)).map((row) => row.playerId);
      advanced = await createStageLobbies(tx, match.tournamentId, nextStage.id, qualifiedIds, nextCfg);
      if (advanced.length && nextStage.status === "SCHEDULED") await tx.competitionStage.update({ where: { id: nextStage.id }, data: { status: "READY" } });
    } else {
      await tx.tournament.update({ where: { id: match.tournamentId }, data: { status: "COMPLETED", endDate: new Date() } });
    }
    const eventExists = await tx.progressionEvent.findFirst({ where: { matchId: match.id, eventType: "STAGE_COMPLETED" }, select: { id: true } });
    if (!eventExists) await tx.progressionEvent.create({ data: { tournamentId: match.tournamentId, matchId: match.id, eventType: "STAGE_COMPLETED", payload: { stageId: stage.id, qualifiedPlayerIds: [...qualified], standings, matchPointWinner } } });
    return { stageCompleted: true, advanced, standings, qualifiedPlayerIds: [...qualified], nextStageId: nextStage?.id ?? null, matchPointWinner };
  }, { timeout: 30_000 });
}

export async function getBattleRoyaleStandings(db: PrismaClient, tournamentId: string, stageId?: string) {
  const stage = stageId ? await db.competitionStage.findUnique({ where: { id: stageId } }) : await db.competitionStage.findFirst({ where: { tournamentId }, orderBy: { orderIndex: "asc" } });
  if (!stage) return [];
  return calculateBattleRoyaleStandings(db, stage.id, stageConfig(stage));
}
