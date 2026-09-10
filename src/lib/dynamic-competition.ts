import { z } from "zod";

export const StageFormatSchema = z.enum([
  "BATTLE_ROYALE_SESSION",
  "ROUND_ROBIN",
  "SWISS",
  "SINGLE_ELIMINATION",
  "DOUBLE_ELIMINATION",
  "LEAGUE",
  "CUSTOM",
]);

export const SessionModeSchema = z.enum([
  "FIXED_GAMES",
  "FIXED_TIME",
  "UNTIL_THRESHOLD",
  "MATCH",
]);

export const AdvancementRuleSchema = z.object({
  method: z.enum(["TOP_N", "TOP_PERCENT", "POINTS_THRESHOLD", "WINS", "MANUAL", "ALL"]),
  value: z.number().int().nonnegative().optional(),
  tieBreaker: z.array(z.string()).default([]),
});

export const VictoryConditionSchema = z.object({
  method: z.enum([
    "HIGHEST_SCORE",
    "MATCH_POINT",
    "LAST_SURVIVOR",
    "MOST_WINS",
    "CUSTOM",
  ]),
  threshold: z.number().int().positive().optional(),
  requiresWinAfterThreshold: z.boolean().default(false),
});

export const PlacementPointSchema = z.object({
  place: z.number().int().positive(),
  points: z.number().int(),
});

export const ScoringRuleSchema = z.object({
  placementPoints: z.array(PlacementPointSchema).default([]),
  eliminationPoints: z.number().int().default(0),
  bonuses: z.record(z.number().int()).default({}),
  penalties: z.record(z.number().int()).default({}),
});

export const CompetitionStageConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  format: StageFormatSchema,
  session: z.object({
    mode: SessionModeSchema,
    games: z.number().int().positive().optional(),
    durationMinutes: z.number().int().positive().optional(),
  }),
  scoring: ScoringRuleSchema,
  advancement: AdvancementRuleSchema,
  victory: VictoryConditionSchema,
  rules: z.record(z.unknown()).default({}),
});

export const DynamicCompetitionConfigSchema = z.object({
  version: z.literal(1),
  family: z.enum(["STANDARD", "BATTLE_ROYALE", "CUSTOM"]),
  stages: z.array(CompetitionStageConfigSchema).min(1),
});

export type DynamicCompetitionConfig = z.infer<typeof DynamicCompetitionConfigSchema>;
export type CompetitionStageConfig = z.infer<typeof CompetitionStageConfigSchema>;

const STANDARD_FORMATS = new Set([
  "ROUND_ROBIN",
  "SWISS",
  "SINGLE_ELIMINATION",
  "DOUBLE_ELIMINATION",
  "LEAGUE",
]);

/** Battle Royale stages are session/scoring based, never bracket-format based. */
export function isBattleRoyaleStage(format: string): boolean {
  return format === "BATTLE_ROYALE_SESSION";
}

export function getAllowedStageFormats(family: DynamicCompetitionConfig["family"]): string[] {
  if (family === "BATTLE_ROYALE") return ["BATTLE_ROYALE_SESSION", "CUSTOM"];
  if (family === "CUSTOM") return [...STANDARD_FORMATS, "BATTLE_ROYALE_SESSION", "CUSTOM"];
  return [...STANDARD_FORMATS];
}

export function validateDynamicCompetition(input: unknown): DynamicCompetitionConfig {
  const config = DynamicCompetitionConfigSchema.parse(input);
  const orders = config.stages.map((stage) => stage.order);
  if (new Set(orders).size !== orders.length) {
    throw new Error("Competition stages must have unique order values");
  }

  for (const stage of config.stages) {
    if (config.family === "BATTLE_ROYALE" && STANDARD_FORMATS.has(stage.format)) {
      throw new Error(`Battle Royale stage ${stage.name} cannot use ${stage.format}`);
    }
    if (stage.session.mode === "FIXED_GAMES" && !stage.session.games) {
      throw new Error(`Stage ${stage.name} requires a game count`);
    }
    if (stage.session.mode === "FIXED_TIME" && !stage.session.durationMinutes) {
      throw new Error(`Stage ${stage.name} requires a duration`);
    }
    if (stage.victory.method === "MATCH_POINT" && !stage.victory.threshold) {
      throw new Error(`Stage ${stage.name} requires a match-point threshold`);
    }
  }

  return {
    ...config,
    stages: [...config.stages].sort((a, b) => a.order - b.order),
  };
}

export function createBattleRoyalePreset(): DynamicCompetitionConfig {
  return {
    version: 1,
    family: "BATTLE_ROYALE",
    stages: [
      {
        id: "qualifiers",
        name: "Qualifiers",
        order: 0,
        format: "BATTLE_ROYALE_SESSION",
        session: { mode: "FIXED_GAMES", games: 6 },
        scoring: { placementPoints: [], eliminationPoints: 1, bonuses: {}, penalties: {} },
        advancement: { method: "TOP_N", value: 40, tieBreaker: ["score", "eliminations"] },
        victory: { method: "HIGHEST_SCORE", requiresWinAfterThreshold: false },
        rules: {},
      },
      {
        id: "semifinals",
        name: "Semifinals",
        order: 1,
        format: "BATTLE_ROYALE_SESSION",
        session: { mode: "FIXED_GAMES", games: 5 },
        scoring: { placementPoints: [], eliminationPoints: 1, bonuses: {}, penalties: {} },
        advancement: { method: "TOP_N", value: 20, tieBreaker: ["score", "eliminations"] },
        victory: { method: "HIGHEST_SCORE", requiresWinAfterThreshold: false },
        rules: {},
      },
      {
        id: "finals",
        name: "Finals",
        order: 2,
        format: "BATTLE_ROYALE_SESSION",
        session: { mode: "UNTIL_THRESHOLD" },
        scoring: { placementPoints: [], eliminationPoints: 1, bonuses: {}, penalties: {} },
        advancement: { method: "ALL", tieBreaker: ["score", "eliminations"] },
        victory: { method: "MATCH_POINT", threshold: 50, requiresWinAfterThreshold: true },
        rules: {},
      },
    ],
  };
}
