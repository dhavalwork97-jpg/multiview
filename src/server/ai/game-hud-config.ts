/**
 * HP bar crop coordinates, per game, at 1920x1080 source resolution.
 * These are NOT guessed at — they have to be measured once against a
 * real capture of each game's HUD (pause a recording, find the pixel
 * bounds of the health bar) and filled in here. Shipping with wrong
 * coordinates doesn't fail loudly — it just reads noise and produces
 * garbage hype/comeback signal, so getting these right matters more than
 * almost anything else in this file.
 *
 * `filledColor` is the bar's "full health" color family (used to tell
 * "bar" from "background" when scanning pixels in hp-bar-reader.ts) —
 * most fighting games shift color as health drops (green → yellow → red),
 * so this is deliberately a loose color-family check, not an exact match.
 */
export type HudConfig = {
  game: string;
  frameWidth: number;
  frameHeight: number;
  playerOneBar: { x: number; y: number; width: number; height: number };
  playerTwoBar: { x: number; y: number; width: number; height: number };
  /** returns true if an RGB pixel looks like "bar is present here" vs. background/depleted */
  isFilledPixel: (r: number, g: number, b: number) => boolean;
};

function looksLikeHealthBarColor(r: number, g: number, b: number): boolean {
  // Loose green/yellow/orange/red family check, rejects near-black
  // (background) and near-white (UI chrome/borders). This is the part
  // that most needs game-specific tuning in practice — a single
  // heuristic across three different UIs is a starting point, not a
  // finished calibration.
  const brightness = (r + g + b) / 3;
  if (brightness < 40 || brightness > 245) return false;
  return g > 60 || r > 100; // covers green (full) through red (low)
}

export const HUD_CONFIGS: Record<string, HudConfig> = {
  "Street Fighter 6": {
    game: "Street Fighter 6",
    frameWidth: 1920,
    frameHeight: 1080,
    // PLACEHOLDER coordinates — measure against a real SF6 broadcast
    // capture before relying on this in production.
    playerOneBar: { x: 220, y: 62, width: 560, height: 14 },
    playerTwoBar: { x: 1140, y: 62, width: 560, height: 14 },
    isFilledPixel: looksLikeHealthBarColor,
  },
  "Tekken 8": {
    game: "Tekken 8",
    frameWidth: 1920,
    frameHeight: 1080,
    playerOneBar: { x: 200, y: 48, width: 540, height: 12 },
    playerTwoBar: { x: 1180, y: 48, width: 540, height: 12 },
    isFilledPixel: looksLikeHealthBarColor,
  },
  "Guilty Gear -STRIVE-": {
    game: "Guilty Gear -STRIVE-",
    frameWidth: 1920,
    frameHeight: 1080,
    playerOneBar: { x: 240, y: 40, width: 520, height: 10 },
    playerTwoBar: { x: 1160, y: 40, width: 520, height: 10 },
    isFilledPixel: looksLikeHealthBarColor,
  },
};
