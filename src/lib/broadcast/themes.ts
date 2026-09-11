export type BroadcastThemeId =
  | "valorant"
  | "cs2"
  | "dota2"
  | "league"
  | "tekken"
  | "pubg"
  | "rocket-league"
  | "default";

export type BroadcastTheme = {
  id: BroadcastThemeId;
  label: string;
  accent: string;
  accentAlt: string;
  surface: string;
  text: string;
  glow: string;
  shape: "angular" | "tech" | "arcade" | "neon" | "classic";
};

export const BROADCAST_THEMES: Record<BroadcastThemeId, BroadcastTheme> = {
  valorant: { id: "valorant", label: "Valorant", accent: "#ff4655", accentAlt: "#54d9ff", surface: "#090a12", text: "#f7f8ff", glow: "rgba(255,70,85,.42)", shape: "angular" },
  cs2: { id: "cs2", label: "Counter-Strike 2", accent: "#f59e0b", accentAlt: "#dbe5ef", surface: "#090b0f", text: "#f8fafc", glow: "rgba(245,158,11,.38)", shape: "tech" },
  dota2: { id: "dota2", label: "Dota 2", accent: "#ef4444", accentAlt: "#f59e0b", surface: "#0d0908", text: "#fff7ed", glow: "rgba(239,68,68,.4)", shape: "classic" },
  league: { id: "league", label: "League of Legends", accent: "#38bdf8", accentAlt: "#fbbf24", surface: "#07101a", text: "#f8fafc", glow: "rgba(56,189,248,.4)", shape: "classic" },
  tekken: { id: "tekken", label: "Tekken", accent: "#a855f7", accentAlt: "#ec4899", surface: "#0c0712", text: "#fff7ff", glow: "rgba(168,85,247,.45)", shape: "arcade" },
  pubg: { id: "pubg", label: "PUBG / BGMI", accent: "#facc15", accentAlt: "#f97316", surface: "#0d0c08", text: "#fffef5", glow: "rgba(250,204,21,.35)", shape: "tech" },
  "rocket-league": { id: "rocket-league", label: "Rocket League", accent: "#38bdf8", accentAlt: "#fb923c", surface: "#06101a", text: "#f8fafc", glow: "rgba(56,189,248,.4)", shape: "neon" },
  default: { id: "default", label: "FGC Broadcast", accent: "#8b5cf6", accentAlt: "#22d3ee", surface: "#080910", text: "#f8fafc", glow: "rgba(139,92,246,.42)", shape: "neon" },
};

export function normalizeBroadcastTheme(game?: string | null): BroadcastThemeId {
  const value = (game ?? "").trim().toLowerCase();
  if (value.includes("valorant")) return "valorant";
  if (value === "cs2" || value.includes("counter-strike")) return "cs2";
  if (value.includes("dota")) return "dota2";
  if (value.includes("league")) return "league";
  if (value.includes("tekken")) return "tekken";
  if (value.includes("pubg") || value.includes("bgmi")) return "pubg";
  if (value.includes("rocket league")) return "rocket-league";
  return "default";
}

export function getBroadcastTheme(game?: string | null) {
  return BROADCAST_THEMES[normalizeBroadcastTheme(game)];
}
