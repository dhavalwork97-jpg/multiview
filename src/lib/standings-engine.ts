import type { MatchRules } from "@/lib/match-engine/types";

type Participant = {
  playerId: string | null;
  teamId: string | null;
  role?: string | null;
  displayName?: string | null;
  player?: { gamertag: string } | null;
  team?: { name: string } | null;
};

type Side = {
  id: string;
  sideKey: string;
  score: number;
  participants: Participant[];
};

type Match = {
  id: string;
  status: string;
  playerOneScore: number;
  playerTwoScore: number;
  winnerSideId: string | null;
  rulesSnapshot: unknown;
  sides: Side[];
};

export type StandingRow = {
  rank: number;
  key: string;
  label: string;
  participantType: "team" | "player" | "mixed";
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  winRate: number;
};

function rulesFor(snapshot: unknown): MatchRules {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return {};
  return snapshot as MatchRules;
}

function sideIdentity(side: Side) {
  const team = side.participants.find((p) => p.teamId);
  if (team?.teamId) return { key: `team:${team.teamId}`, label: team.team?.name ?? team.displayName ?? team.teamId, participantType: "team" as const };

  const players = side.participants.filter((p) => p.playerId).sort((a, b) => String(a.playerId).localeCompare(String(b.playerId)));
  if (players.length) {
    return {
      key: `players:${players.map((p) => p.playerId).join(",")}`,
      label: players.map((p) => p.player?.gamertag ?? p.displayName ?? p.playerId).join(" / "),
      participantType: players.length > 1 ? "mixed" as const : "player" as const,
    };
  }

  const fallback = side.participants.map((p) => p.displayName).filter(Boolean).join(" / ") || side.sideKey;
  return { key: `display:${fallback}`, label: fallback, participantType: "mixed" as const };
}

export function calculateStandings(matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  function ensure(side: Side) {
    const identity = sideIdentity(side);
    const existing = rows.get(identity.key);
    if (existing) return existing;
    const row: StandingRow = {
      rank: 0,
      key: identity.key,
      label: identity.label,
      participantType: identity.participantType,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDiff: 0,
      winRate: 0,
    };
    rows.set(identity.key, row);
    return row;
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED") continue;
    const a = match.sides.find((s) => s.sideKey === "A");
    const b = match.sides.find((s) => s.sideKey === "B");
    if (!a || !b) continue;

    const aRow = ensure(a);
    const bRow = ensure(b);
    const aScore = a.score ?? match.playerOneScore ?? 0;
    const bScore = b.score ?? match.playerTwoScore ?? 0;
    aRow.played += 1;
    bRow.played += 1;
    aRow.scoreFor += aScore;
    aRow.scoreAgainst += bScore;
    bRow.scoreFor += bScore;
    bRow.scoreAgainst += aScore;

    const winner = match.winnerSideId === a.id ? "A" : match.winnerSideId === b.id ? "B" : aScore === bScore ? null : aScore > bScore ? "A" : "B";
    const rules = rulesFor(match.rulesSnapshot);
    const winPoints = typeof rules.winPoints === "number" ? rules.winPoints : 3;
    const drawPoints = typeof rules.drawPoints === "number" ? rules.drawPoints : 1;
    const lossPoints = typeof rules.lossPoints === "number" ? rules.lossPoints : 0;

    if (!winner) {
      aRow.draws += 1;
      bRow.draws += 1;
      aRow.points += drawPoints;
      bRow.points += drawPoints;
    } else if (winner === "A") {
      aRow.wins += 1;
      bRow.losses += 1;
      aRow.points += winPoints;
      bRow.points += lossPoints;
    } else {
      bRow.wins += 1;
      aRow.losses += 1;
      bRow.points += winPoints;
      aRow.points += lossPoints;
    }
  }

  const result = [...rows.values()].map((row) => ({ ...row, scoreDiff: row.scoreFor - row.scoreAgainst, winRate: row.played ? row.wins / row.played : 0 }));
  result.sort((a, b) => b.points - a.points || b.wins - a.wins || b.scoreDiff - a.scoreDiff || b.scoreFor - a.scoreFor || a.label.localeCompare(b.label));
  return result.map((row, index) => ({ ...row, rank: index + 1 }));
}
