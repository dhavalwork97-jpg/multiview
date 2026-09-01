import {
  resolveBattleRoyalePlacementPoints,
} from "@/lib/match-engine/adapters";
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

type ScoreEvent = {
  sideId: string;
  metric: string;
  value: number;
};

type Match = {
  id: string;
  status: string;
  playerOneScore: number;
  playerTwoScore: number;
  winnerSideId: string | null;
  rulesSnapshot: unknown;
  sides: Side[];
  scoreEvents?: ScoreEvent[];
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
  placementPoints: number;
  kills: number;
  firstPlaceFinishes: number;
};

function rulesFor(snapshot: unknown): MatchRules {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  ) {
    return {};
  }

  return snapshot as MatchRules;
}

function sideIdentity(side: Side) {
  const team = side.participants.find((p) => p.teamId);

  if (team?.teamId) {
    return {
      key: `team:${team.teamId}`,
      label:
        team.team?.name ??
        team.displayName ??
        team.teamId,
      participantType: "team" as const,
    };
  }

  const players = side.participants
    .filter((p) => p.playerId)
    .sort((a, b) =>
      String(a.playerId).localeCompare(
        String(b.playerId),
      ),
    );

  if (players.length) {
    return {
      key: `players:${players
        .map((p) => p.playerId)
        .join(",")}`,
      label: players
        .map(
          (p) =>
            p.player?.gamertag ??
            p.displayName ??
            p.playerId,
        )
        .join(" / "),
      participantType:
        players.length > 1
          ? ("mixed" as const)
          : ("player" as const),
    };
  }

  const fallback =
    side.participants
      .map((p) => p.displayName)
      .filter(Boolean)
      .join(" / ") || side.sideKey;

  return {
    key: `display:${fallback}`,
    label: fallback,
    participantType: "mixed" as const,
  };
}

export function calculateStandings(
  matches: Match[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  function ensure(side: Side) {
    const identity = sideIdentity(side);
    const existing = rows.get(identity.key);

    if (existing) {
      return existing;
    }

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

      placementPoints: 0,
      kills: 0,
      firstPlaceFinishes: 0,
    };

    rows.set(identity.key, row);

    return row;
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED") {
      continue;
    }

    const a = match.sides.find(
      (side) => side.sideKey === "A",
    );

    const b = match.sides.find(
      (side) => side.sideKey === "B",
    );

    if (!a || !b) {
      continue;
    }

    const aRow = ensure(a);
    const bRow = ensure(b);

    const aScore =
      a.score ?? match.playerOneScore ?? 0;

    const bScore =
      b.score ?? match.playerTwoScore ?? 0;

    const rules = rulesFor(match.rulesSnapshot);
    const adapter =
      rules.scoringAdapter ?? "points";

    /*
     * Battle Royale standings:
     *
     * Placement + kills + direct points determine
     * tournament points. Placement is also used for
     * the first-place tiebreaker.
     */
    if (adapter === "battle_royale") {
      const placementPoints =
        resolveBattleRoyalePlacementPoints(rules);

      const finishPoints = Number(
        rules.finishPoints ??
          rules.eliminationPoints ??
          1,
      );

      for (const side of match.sides) {
        const row = ensure(side);

        row.played += 1;

        const events =
          match.scoreEvents?.filter(
            (event) => event.sideId === side.id,
          ) ?? [];

        const placementEvent = events.find(
          (event) => event.metric === "placement",
        );

        const killEvents = events.filter(
          (event) => event.metric === "kills",
        );

        const pointEvents = events.filter(
          (event) => event.metric === "points",
        );

        const placement =
          placementEvent !== undefined
            ? Number(placementEvent.value)
            : null;

        const kills = killEvents.reduce(
          (total, event) =>
            total + Number(event.value),
          0,
        );

        const directPoints = pointEvents.reduce(
          (total, event) =>
            total + Number(event.value),
          0,
        );

        const placementScore =
          placement !== null
            ? placementPoints[placement] ?? 0
            : 0;

        const killScore =
          kills * finishPoints;

        const totalScore =
          placementScore +
          killScore +
          directPoints;

        row.placementPoints += placementScore;
        row.kills += kills;
        row.points += totalScore;
        row.scoreFor += totalScore;

        if (placement === 1) {
          row.firstPlaceFinishes += 1;
          row.wins += 1;
        }
      }

      continue;
    }

    /*
     * Normal two-side standings.
     */
    aRow.played += 1;
    bRow.played += 1;

    aRow.scoreFor += aScore;
    aRow.scoreAgainst += bScore;

    bRow.scoreFor += bScore;
    bRow.scoreAgainst += aScore;

    const winner =
      match.winnerSideId === a.id
        ? "A"
        : match.winnerSideId === b.id
          ? "B"
          : aScore === bScore
            ? null
            : aScore > bScore
              ? "A"
              : "B";

    const winPoints =
      typeof rules.winPoints === "number"
        ? rules.winPoints
        : 3;

    const drawPoints =
      typeof rules.drawPoints === "number"
        ? rules.drawPoints
        : 1;

    const lossPoints =
      typeof rules.lossPoints === "number"
        ? rules.lossPoints
        : 0;

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

  const result = [...rows.values()].map(
    (row) => ({
      ...row,
      scoreDiff:
        row.scoreFor - row.scoreAgainst,
      winRate:
        row.played > 0
          ? row.wins / row.played
          : 0,
    }),
  );

  result.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (
      b.firstPlaceFinishes !==
      a.firstPlaceFinishes
    ) {
      return (
        b.firstPlaceFinishes -
        a.firstPlaceFinishes
      );
    }

    if (
      b.placementPoints !==
      a.placementPoints
    ) {
      return (
        b.placementPoints -
        a.placementPoints
      );
    }

    if (b.kills !== a.kills) {
      return b.kills - a.kills;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (b.scoreDiff !== a.scoreDiff) {
      return b.scoreDiff - a.scoreDiff;
    }

    return a.label.localeCompare(b.label);
  });

  return result.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}