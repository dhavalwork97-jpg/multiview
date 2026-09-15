export type GameCatalogEntry = {
  slug: string;
  name: string;
  genre: "fighting" | "moba";
  characterLabel: "Fighters" | "Heroes";
  rosterSource: string;
};

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    slug: "tekken-8",
    name: "Tekken 8",
    genre: "fighting",
    characterLabel: "Fighters",
    rosterSource: "Bandai Namco official fighter roster",
  },
  {
    slug: "street-fighter-6",
    name: "Street Fighter 6",
    genre: "fighting",
    characterLabel: "Fighters",
    rosterSource: "Capcom official roster / Year 3 release information",
  },
  {
    slug: "mobile-legends-bang-bang",
    name: "Mobile Legends: Bang Bang",
    genre: "moba",
    characterLabel: "Heroes",
    rosterSource: "Current 2026 roster snapshot",
  },
  {
    slug: "honor-of-kings",
    name: "Honor of Kings",
    genre: "moba",
    characterLabel: "Heroes",
    rosterSource: "Current 2026 international roster snapshot",
  },
];
