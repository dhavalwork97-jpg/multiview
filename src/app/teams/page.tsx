import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await db.team.findMany({ orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, logoUrl: true, country: true, _count: { select: { members: true, tournaments: true } } } });
  return <main className="page-shell"><div className="page-container">
    <header className="mb-6 sm:mb-8"><p className="page-kicker">Competition directory</p><div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="page-title">Teams</h1><p className="page-subtitle">Explore squads, rosters and competitive history.</p></div><Link href="/tournaments" className="action-secondary self-start sm:self-auto">Tournaments</Link></div></header>
    {teams.length === 0 ? <div className="empty-state"><p className="page-kicker">No teams</p><h2 className="mt-2 font-display text-2xl uppercase tracking-wide">No squads yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Teams will appear here as competitors enter public competitions.</p><Link href="/tournaments" className="action-secondary mt-5">Explore tournaments</Link></div> :
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{teams.map(t => <Link key={t.id} href={`/teams/${t.id}`} className="surface-card surface-card-interactive group block p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60">
      <div className="flex items-center gap-3">{t.logoUrl ? <img src={t.logoUrl} alt="" className="h-12 w-12 rounded-card object-cover ring-1 ring-arena-700" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-card bg-arena-800 font-display text-xl text-ink-muted ring-1 ring-arena-700">{t.name[0]?.toUpperCase() ?? "T"}</div>}
      <div className="min-w-0"><h2 className="truncate font-display text-xl uppercase tracking-wide group-hover:text-signal-live">{t.name}</h2><p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.country ?? "Open roster"}</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-arena-700 pt-3"><div><span className="block metric-label">Roster</span><span className="text-sm text-ink-muted">{t._count.members} members</span></div><div><span className="block metric-label">Events</span><span className="text-sm text-ink-muted">{t._count.tournaments} tournaments</span></div></div>
      <div className="mt-4 border-t border-arena-700 pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">View team →</div>
    </Link>)}</div>}
  </div></main>;
}
