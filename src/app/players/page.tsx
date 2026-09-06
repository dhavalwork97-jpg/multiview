import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await db.player.findMany({ orderBy: { gamertag: "asc" }, take: 100, select: { id: true, gamertag: true, realName: true, country: true, avatarUrl: true, _count: { select: { matchParticipants: true, entrants: true } } } });
  return <main className="page-shell"><div className="page-container">
    <header className="mb-6 sm:mb-8"><p className="page-kicker">Competition directory</p><div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="page-title">Players</h1><p className="page-subtitle">Discover competitors, event history and match activity.</p></div><Link href="/tournaments" className="action-secondary self-start sm:self-auto">Tournaments</Link></div></header>
    {players.length === 0 ? <div className="empty-state"><p className="page-kicker">No players</p><h2 className="mt-2 font-display text-2xl uppercase tracking-wide">No competitors yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Registered competitors will appear here as public competition data becomes available.</p><Link href="/tournaments" className="action-secondary mt-5">Explore tournaments</Link></div> :
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{players.map(p => <Link key={p.id} href={`/players/${p.id}`} className="surface-card surface-card-interactive group block p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60">
      <div className="flex items-center gap-3">{p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-arena-700" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-arena-800 font-display text-xl text-ink-muted ring-1 ring-arena-700">{p.gamertag[0]?.toUpperCase()}</div>}
      <div className="min-w-0"><h2 className="truncate font-display text-xl uppercase tracking-wide group-hover:text-signal-live">{p.gamertag}</h2><p className="mt-0.5 truncate text-xs text-ink-faint">{p.realName ?? p.country ?? "Competitor"}</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-arena-700 pt-3"><div><span className="block metric-label">Matches</span><span className="text-sm text-ink-muted">{p._count.matchParticipants}</span></div><div><span className="block metric-label">Entries</span><span className="text-sm text-ink-muted">{p._count.entrants}</span></div></div>
      <div className="mt-4 border-t border-arena-700 pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">View player →</div>
    </Link>)}</div>}
  </div></main>;
}
