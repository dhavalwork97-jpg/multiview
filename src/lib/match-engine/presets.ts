import { SPORT_DEFAULTS } from "./index";

export const COMPETITION_PRESETS = Object.fromEntries(
  Object.entries(SPORT_DEFAULTS).map(([sport, rules]) => [sport, { sport, rules }]),
);
