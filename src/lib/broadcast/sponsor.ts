export type BroadcastSponsor = {
  id: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  enabled: boolean;
  durationMs: number;
};

export type SponsorRotation = {
  sponsors: BroadcastSponsor[];
  intervalMs: number;
};

export function getActiveSponsor(rotation: SponsorRotation, elapsedMs: number): BroadcastSponsor | null {
  const enabled = rotation.sponsors.filter((sponsor) => sponsor.enabled);
  if (!enabled.length) return null;
  const slot = Math.floor(Math.max(0, elapsedMs) / Math.max(1000, rotation.intervalMs));
  return enabled[slot % enabled.length] ?? null;
}

export function normalizeSponsor(value: Partial<BroadcastSponsor>, index = 0): BroadcastSponsor {
  return {
    id: value.id?.trim() || `sponsor-${index + 1}`,
    name: value.name?.trim() || "Sponsor",
    logoUrl: value.logoUrl?.trim() || null,
    websiteUrl: value.websiteUrl?.trim() || null,
    enabled: value.enabled !== false,
    durationMs: Math.max(1000, Math.floor(value.durationMs ?? 6000)),
  };
}
