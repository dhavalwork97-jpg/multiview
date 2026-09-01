export type ObserverTeam = {
  key: string;
  label: string;
  alive?: number | null;
  kills?: number;
  points?: number;
};

export type ObserverFight = {
  id: string;
  teamKeys: string[];
  intensity: number;
  label?: string;
  updatedAt?: string;
};

export type ObserverContext = {
  matchId: string;
  mode: "FREE" | "TEAM";
  currentTeamKey: string | null;
  teams: ObserverTeam[];
  fights: ObserverFight[];
  generatedAt: string;
};

export type ObserverRecommendation = {
  teamKey: string;
  label: string;
  priority: number;
  reason: string;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function rankObserverRecommendations(context: ObserverContext): ObserverRecommendation[] {
  const byTeam = new Map<string, ObserverRecommendation>();
  for (const team of context.teams) {
    const fights = context.fights.filter((fight) => fight.teamKeys.includes(team.key));
    const fightScore = fights.reduce((sum, fight) => sum + clamp(fight.intensity, 0, 100), 0);
    const kills = Math.max(0, team.kills ?? 0);
    const alive = team.alive == null ? 0 : Math.max(0, team.alive);
    const priority = clamp(fightScore * 0.75 + Math.min(kills * 4, 20) + Math.min(alive * 1.5, 10));
    if (priority > 0) {
      const strongestFight = [...fights].sort((a, b) => b.intensity - a.intensity)[0];
      byTeam.set(team.key, {
        teamKey: team.key,
        label: team.label,
        priority: Math.round(priority),
        reason: strongestFight?.label ?? (fights.length ? "Active fight" : "Recent combat activity"),
      });
    }
  }
  return [...byTeam.values()].sort((a, b) => b.priority - a.priority);
}

export function isBattleRoyaleMatch(match: { scoringAdapter?: string | null; sides?: unknown[] | null }) {
  return match.scoringAdapter === "battle_royale" || (match.sides?.length ?? 0) > 2;
}
