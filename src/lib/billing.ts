import type { User } from "@prisma/client";

/**
 * What Premium actually unlocks, listed in one place so it's not
 * scattered as ad-hoc checks: WebRTC low-latency mode (Phase 3's
 * higher-cost viewing path — see STREAMING_ARCHITECTURE.md on why it
 * isn't free-tier-by-default at scale) and 9-tile multi-view (vs. 4-tile
 * free). Everything else — HLS viewing, clips, brackets, search — stays
 * free; gating the browsing/discovery experience behind a paywall would
 * work against the platform's whole point.
 */
export function isPremium(user: Pick<User, "subscriptionStatus"> | null | undefined): boolean {
  return user?.subscriptionStatus === "ACTIVE";
}

export function maxMultiViewTiles(user: Pick<User, "subscriptionStatus"> | null | undefined): 4 | 9 {
  return isPremium(user) ? 9 : 4;
}
