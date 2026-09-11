import type { BroadcastThemeId } from "./themes";

export type OverlayPosition = "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";
export type OverlayElementKind = "scoreboard" | "lower-third" | "countdown" | "versus" | "winner" | "replay" | "sponsor" | "program";
export type OverlayElement = { id: string; kind: OverlayElementKind; enabled: boolean; position: OverlayPosition; opacity: number; scale: number; accent?: string; label?: string };
export type BroadcastOverlayConfig = { themeId: BroadcastThemeId; customAccent?: string; customAccentAlt?: string; surfaceOpacity: number; fontFamily: string; sponsor: { enabled: boolean; position: OverlayPosition; logoUrl?: string | null; label: string }; elements: OverlayElement[] };
export const DEFAULT_OVERLAY_ELEMENTS: OverlayElement[] = [
  { id: "scoreboard", kind: "scoreboard", enabled: true, position: "top-center", opacity: 1, scale: 1 }, { id: "lower-third", kind: "lower-third", enabled: true, position: "bottom-left", opacity: 1, scale: 1 }, { id: "countdown", kind: "countdown", enabled: true, position: "center", opacity: 1, scale: 1 }, { id: "versus", kind: "versus", enabled: true, position: "center", opacity: 1, scale: 1 }, { id: "winner", kind: "winner", enabled: true, position: "center", opacity: 1, scale: 1 }, { id: "replay", kind: "replay", enabled: true, position: "bottom-right", opacity: 1, scale: 1 }, { id: "sponsor", kind: "sponsor", enabled: true, position: "bottom-right", opacity: 1, scale: 1 }, { id: "program", kind: "program", enabled: true, position: "bottom-center", opacity: 1, scale: 1 },
];
export const DEFAULT_OVERLAY_CONFIG: BroadcastOverlayConfig = { themeId: "default", surfaceOpacity: 0.94, fontFamily: "Inter, system-ui, sans-serif", sponsor: { enabled: true, position: "bottom-right", label: "POWERED BY" }, elements: DEFAULT_OVERLAY_ELEMENTS };
export function normalizeOverlayConfig(value: Partial<BroadcastOverlayConfig> | null | undefined): BroadcastOverlayConfig {
  const surfaceOpacity = Number(value?.surfaceOpacity ?? DEFAULT_OVERLAY_CONFIG.surfaceOpacity);
  return { ...DEFAULT_OVERLAY_CONFIG, ...(value ?? {}), surfaceOpacity: Math.min(1, Math.max(0.55, Number.isFinite(surfaceOpacity) ? surfaceOpacity : DEFAULT_OVERLAY_CONFIG.surfaceOpacity)), sponsor: { ...DEFAULT_OVERLAY_CONFIG.sponsor, ...(value?.sponsor ?? {}) }, elements: (value?.elements ?? DEFAULT_OVERLAY_ELEMENTS).map((element, index) => ({ ...DEFAULT_OVERLAY_ELEMENTS[index % DEFAULT_OVERLAY_ELEMENTS.length], ...element, id: element.id?.trim() || `element-${index + 1}`, opacity: Math.min(1, Math.max(0, Number(element.opacity ?? 1))), scale: Math.min(2, Math.max(0.5, Number(element.scale ?? 1))) })) };
}
