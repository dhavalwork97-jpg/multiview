import Link from "next/link";
import { db } from "@/lib/db";

export async function SocialPulseWidgets() {
  const since = new Date(Date.now() - 5 * 60_000);
  const [presence, reactions, hottest] = await Promise.all([
    db.viewerPresence.count({ where: { expiresAt: { gt: new Date() }, userId: { not: null } } }),
    db.reactionEvent.groupBy({ by: ["reaction"], where: { createdAt: { gte: since } }, _count: { reaction: true }, orderBy: { _count: { reaction: "desc" } }, take: 3 }),
    db.viewerPresence.groupBy({ by: ["matchId"], where: { expiresAt: { gt: new Date() } }, _count: { matchId: true }, orderBy: { _count: { matchId: "desc" } }, take: 1 }),
  ]);
  const hotMatch = hottest[0] ? await db.match.findUnique({ where: { id: hottest[0].matchId }, select: { id: true, playerOne: { select: { gamertag: true } }, playerTwo: { select: { gamertag: true } } } }) : null;
  return <section className="mb-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <article className="surface-card p-4"><p className="page-kicker">Friends watching</p><p className="mt-2 font-display text-3xl text-signal-live">{presence}</p><p className="mt-1 text-sm text-ink-muted">signed-in viewers live now</p></article>
    <article className="surface-card p-4"><p className="page-kicker">Community activity</p><p className="mt-2 font-display text-3xl">{reactions.reduce((sum, item) => sum + item._count.reaction, 0)}</p><p className="mt-1 text-sm text-ink-muted">reactions in the last 5 min</p></article>
    <article className="surface-card p-4"><p className="page-kicker">Trending reactions</p><p className="mt-2 text-2xl">{reactions.map((item) => item.reaction).join(" ") || "—"}</p><p className="mt-1 text-sm text-ink-muted">community favorites</p></article>
    <article className="surface-card p-4"><p className="page-kicker">Hottest live match</p>{hotMatch ? <Link className="mt-2 block font-display text-lg uppercase hover:text-signal-live" href={`/watch/${hotMatch.id}`}>{hotMatch.playerOne?.gamertag ?? "Side A"} vs {hotMatch.playerTwo?.gamertag ?? "Side B"}</Link> : <p className="mt-2 text-sm text-ink-muted">No live crowd yet</p>}<p className="mt-1 text-sm text-ink-muted">{hottest[0]?._count.matchId ?? 0} watching</p></article>
  </section>;
}
