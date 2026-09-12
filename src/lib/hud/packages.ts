export type HudPackage = {
  id: string;
  name: string;
  family: string;
  description: string;
  games: string[];
  accent: string;
  accent2: string;
  premium?: boolean;
};

export const HUD_PACKAGES: HudPackage[] = [
  { id: "fgc-pro", name: "FGC Pro", family: "Universal", description: "Flagship tournament broadcast package with premium score and player treatment.", games: ["Any"], accent: "#f04444", accent2: "#f6c453" },
  { id: "fgc-arena", name: "FGC Arena", family: "Universal", description: "Aggressive LAN-ready graphics built for fast competitive production.", games: ["Any"], accent: "#ff4d00", accent2: "#7c3aed" },
  { id: "fgc-minimal", name: "FGC Minimal", family: "Universal", description: "Clean, low-footprint HUD for community events and creator streams.", games: ["Any"], accent: "#e5e7eb", accent2: "#6b7280" },
  { id: "fgc-neon", name: "FGC Neon", family: "Universal", description: "High-energy cyber broadcast treatment with luminous accents.", games: ["Any"], accent: "#22d3ee", accent2: "#a855f7" },
  { id: "street-fighter-6", name: "Street Fighter 6", family: "Fighting", description: "Original FGC package tuned for fighting-game match flow and FT sets.", games: ["Street Fighter 6"], accent: "#ef4444", accent2: "#2563eb" },
  { id: "tekken-8", name: "Tekken 8", family: "Fighting", description: "Sharp competitive package with metallic panels and match-point emphasis.", games: ["Tekken 8"], accent: "#8b5cf6", accent2: "#ec4899" },
  { id: "guilty-gear-strive", name: "Guilty Gear Strive", family: "Fighting", description: "Stylized anime-inspired package with bold typography and rhythm.", games: ["Guilty Gear Strive"], accent: "#f97316", accent2: "#eab308" },
  { id: "smash-ultimate", name: "Smash Ultimate", family: "Fighting", description: "Bright stock-focused treatment for platform fighters.", games: ["Super Smash Bros. Ultimate"], accent: "#facc15", accent2: "#38bdf8" },
  { id: "dragon-ball-fighterz", name: "Dragon Ball FighterZ", family: "Fighting", description: "High-energy versus package with dramatic player framing.", games: ["Dragon Ball FighterZ"], accent: "#f97316", accent2: "#facc15" },
  { id: "mortal-kombat-1", name: "Mortal Kombat 1", family: "Fighting", description: "Dark cinematic package for brutal match presentation.", games: ["Mortal Kombat 1"], accent: "#dc2626", accent2: "#991b1b" },
  { id: "valorant-pro", name: "Valorant Pro", family: "FPS", description: "Tactical team-score treatment for round-based competition.", games: ["Valorant"], accent: "#ef4444", accent2: "#f8fafc" },
  { id: "cs2-pro", name: "CS2 Pro", family: "FPS", description: "Compact team, round and map-score broadcast package.", games: ["Counter-Strike 2"], accent: "#f59e0b", accent2: "#38bdf8" },
  { id: "apex-pro", name: "Apex Pro", family: "FPS", description: "Squad-centric package for high-information battle royale broadcasts.", games: ["Apex Legends"], accent: "#f97316", accent2: "#06b6d4" },
  { id: "rainbow-six-pro", name: "Rainbow Six Pro", family: "FPS", description: "Operator-ready tactical broadcast treatment with clear round state.", games: ["Rainbow Six Siege"], accent: "#38bdf8", accent2: "#f8fafc" },
  { id: "league-pro", name: "League Pro", family: "MOBA", description: "Team-versus-team package designed around series and objective context.", games: ["League of Legends"], accent: "#38bdf8", accent2: "#f59e0b" },
  { id: "dota-2-pro", name: "Dota 2 Pro", family: "MOBA", description: "Premium team and series treatment for long-form competition.", games: ["Dota 2"], accent: "#ef4444", accent2: "#f59e0b" },
  { id: "pubg-mobile-pro", name: "PUBG Mobile Pro", family: "Mobile", description: "Mobile esports package optimized for squad and placement information.", games: ["PUBG Mobile"], accent: "#f59e0b", accent2: "#22c55e" },
  { id: "free-fire-pro", name: "Free Fire Pro", family: "Mobile", description: "Fast, high-contrast mobile tournament presentation.", games: ["Free Fire"], accent: "#f97316", accent2: "#eab308" },
  { id: "cod-mobile-pro", name: "COD Mobile Pro", family: "Mobile", description: "Competitive mobile FPS package with crisp team and round state.", games: ["Call of Duty Mobile"], accent: "#84cc16", accent2: "#e5e7eb" },
];

export function getHudPackage(id: string) {
  return HUD_PACKAGES.find((pkg) => pkg.id === id) ?? HUD_PACKAGES[0];
}
