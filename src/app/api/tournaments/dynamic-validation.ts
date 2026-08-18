import { z } from "zod";
import { getCompetitionPreset } from "@/lib/competition-engine";

export const dynamicCompetitionFields = {
  sport: z.string().trim().min(2).max(60),
  competitionType: z.enum(["tournament", "league", "event"]),
  participantMode: z.enum(["individual", "team", "pair", "mixed"]),
  scoringMode: z.string().trim().min(2).max(40),
  competitionPreset: z.string().trim().min(2).max(40),
  rules: z.record(z.unknown()).optional(),
};

export function normalizeCompetition(input: {
  sport: string;
  competitionType: "tournament" | "league" | "event";
  participantMode: "individual" | "team" | "pair" | "mixed";
  scoringMode: string;
  competitionPreset: string;
  rules?: Record<string, unknown>;
}) {
  const preset = getCompetitionPreset(input.competitionPreset);
  return {
    sport: input.sport.trim(),
    competitionType: input.competitionType,
    participantMode: input.participantMode,
    scoringMode: input.scoringMode.trim(),
    rules: { ...preset.rules, ...(input.rules ?? {}), preset: preset.id },
  };
}
