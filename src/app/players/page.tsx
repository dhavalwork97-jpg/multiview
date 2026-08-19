import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await db.player.findMany({ orderBy: { gamertag: "asc" }, take: 100, select: { id: true, gamertag: true, realName: true, country: true, avatarUrl: true, _count: { select: { matchParticipants: true, entrants: true } } } });
  return <main className="min-h-screen bg-arena-950 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl">
    <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Competition directory</p>
    <div className="mt-1 flex flex-wrap items-end justify-between gap-3"><h1 className="font-display text-4xl uppercase">Players</h1><Link href="/tournaments" className="rounded-card border border-arena-600 px-3 py-2 font-mono text-xs uppercase text-ink-muted hover:border-signal-live hover:text-signal-live">Tournaments</Link></div>
    {players.length === 0 ? <div className="mt-8 rounded-card border border-dashed border-arena-600 p-8 text-center text-sm text-ink-muted">No players have been registered yet.</div> :
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{players.map(p => <Link key={p.id} href={`/players/${p.id}`} className="group rounded-card border border-arena-700 bg-arena-900 p-4 hover:border-signal-live">
      <div className="flex items-center gap-3">{p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-arena-700 font-display text-lg">{p.gamertag[0]?.toUpperCase()}</div>}
      <div className="min-w-0"><h2 className="truncate font-display text-lg uppercase group-hover:text-signal-live">{p.gamertag}</h2><p className="truncate text-xs text-ink-faint">{p.realName ?? p.country ?? "Competitor"}</p></div></div>
      <p className="mt-4 text-xs text-ink-muted">{p._count.matchParticipants} match participations · {p._count.entrants} event entries</p></Link>)}</div>}
  </div></main>;
}
