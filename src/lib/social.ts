import { createHash } from "node:crypto";
import { db } from "@/lib/db";
export { REACTIONS, type Reaction } from "@/lib/social-types";

export function socialSessionHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function getMatchPulse(matchId: string) {
  const since = new Date(Date.now() - 5 * 60_000);
  const [viewers, reactions] = await Promise.all([
    db.viewerPresence.count({ where: { matchId, expiresAt: { gt: new Date() } } }),
    db.reactionEvent.count({ where: { matchId, createdAt: { gte: since } } }),
  ]);
  // A stable, bounded score lets UI use the same intensity scale everywhere.
  return { viewers, reactions, score: Math.min(100, viewers * 3 + reactions * 8) };
}
