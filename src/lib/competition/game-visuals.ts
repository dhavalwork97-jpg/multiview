export type GameVisualDefinition = {
  domain?: string;
  art?: string;
  accent: string;
};

const STEAM_ART = (appId: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const GAME_VISUALS: Record<string, GameVisualDefinition> = {
  "apex legends": { domain: "ea.com", art: STEAM_ART(1172470), accent: "from-orange-500/35 via-red-500/10 to-transparent" },
  apex: { domain: "ea.com", art: STEAM_ART(1172470), accent: "from-orange-500/35 via-red-500/10 to-transparent" },
  "call of duty": { domain: "callofduty.com", art: STEAM_ART(1938090), accent: "from-emerald-500/30 via-lime-500/10 to-transparent" },
  cod: { domain: "callofduty.com", art: STEAM_ART(1938090), accent: "from-emerald-500/30 via-lime-500/10 to-transparent" },
  "counter-strike 2": { domain: "counter-strike.net", art: STEAM_ART(730), accent: "from-orange-500/25 via-slate-500/10 to-transparent" },
  "counter strike 2": { domain: "counter-strike.net", art: STEAM_ART(730), accent: "from-orange-500/25 via-slate-500/10 to-transparent" },
  cs2: { domain: "counter-strike.net", art: STEAM_ART(730), accent: "from-orange-500/25 via-slate-500/10 to-transparent" },
  "dota 2": { domain: "dota2.com", art: STEAM_ART(570), accent: "from-red-500/35 via-orange-500/10 to-transparent" },
  dota: { domain: "dota2.com", art: STEAM_ART(570), accent: "from-red-500/35 via-orange-500/10 to-transparent" },
  fortnite: { domain: "fortnite.com", art: STEAM_ART(1172470), accent: "from-violet-500/35 via-fuchsia-500/10 to-transparent" },
  "league of legends": { domain: "leagueoflegends.com", accent: "from-blue-500/35 via-cyan-500/10 to-transparent" },
  league: { domain: "leagueoflegends.com", accent: "from-blue-500/35 via-cyan-500/10 to-transparent" },
  "mortal kombat": { domain: "mortalkombat.com", art: STEAM_ART(1971870), accent: "from-red-500/35 via-amber-500/10 to-transparent" },
  overwatch: { domain: "overwatch.blizzard.com", art: STEAM_ART(2357570), accent: "from-orange-400/30 via-yellow-400/10 to-transparent" },
  pubg: { domain: "pubg.com", art: STEAM_ART(578080), accent: "from-amber-500/35 via-orange-500/10 to-transparent" },
  bgmi: { domain: "battlegroundsmobileindia.com", art: STEAM_ART(578080), accent: "from-amber-500/35 via-orange-500/10 to-transparent" },
  "street fighter": { domain: "streetfighter.com", art: STEAM_ART(1364780), accent: "from-yellow-500/35 via-red-500/10 to-transparent" },
  "street fighter 6": { domain: "streetfighter.com", art: STEAM_ART(1364780), accent: "from-yellow-500/35 via-red-500/10 to-transparent" },
  tekken: { domain: "tekken.com", art: STEAM_ART(1778820), accent: "from-red-500/35 via-blue-500/10 to-transparent" },
  "tekken 8": { domain: "tekken.com", art: STEAM_ART(1778820), accent: "from-red-500/35 via-blue-500/10 to-transparent" },
  valorant: { domain: "playvalorant.com", accent: "from-red-500/35 via-rose-500/10 to-transparent" },
  "rainbow six siege": { domain: "ubisoft.com", art: STEAM_ART(359550), accent: "from-blue-400/30 via-indigo-500/10 to-transparent" },
  "rainbow six": { domain: "ubisoft.com", art: STEAM_ART(359550), accent: "from-blue-400/30 via-indigo-500/10 to-transparent" },
  "rocket league": { domain: "rocketleague.com", art: STEAM_ART(252950), accent: "from-cyan-400/30 via-blue-500/10 to-transparent" },
  "super smash bros": { domain: "smashbros.com", accent: "from-red-500/30 via-yellow-400/10 to-transparent" },
};

export function normalizeGame(game: string) {
  return game.trim().toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ");
}

export function getGameVisual(game: string) {
  return GAME_VISUALS[normalizeGame(game)] ?? {
    accent: "from-violet-500/30 via-cyan-500/10 to-transparent",
  };
}

export function getGameInitials(game: string) {
  const words = game.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}
