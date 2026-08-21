import { COMPETITION_PRESETS } from "./presets";
import type {
  CompetitionDefinition,
  CompetitionType,
  SportCategory,
} from "./types";

const REGISTRY = new Map<SportCategory, CompetitionDefinition>();

for (const preset of COMPETITION_PRESETS) {
  REGISTRY.set(preset.sport, preset);
}

export function getCompetitionDefinition(
  sport: string,
): CompetitionDefinition {
  return (
    REGISTRY.get(sport as SportCategory) ??
    REGISTRY.get("custom")!
  );
}

export function listCompetitionDefinitions() {
  return [...REGISTRY.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

export function supportsCapability(
  sport: string,
  capability: CompetitionDefinition["capabilities"][number],
) {
  return getCompetitionDefinition(sport).capabilities.includes(capability);
}

export function defaultCompetitionType(sport: string): CompetitionType {
  return getCompetitionDefinition(sport).competitionType;
}