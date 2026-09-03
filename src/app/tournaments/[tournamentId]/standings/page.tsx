import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { calculateStandings } from "@/lib/standings-engine";

export default async function PublicStandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true, name: true, slug: true, sport: true, game: true, status: true,
      matches: {
        where: { status: "COMPLETED" },
        select: {
          id: true, status: true, playerOneScore: true, playerTwoScore: true, winnerSideId: true, rulesSnapshot: true,
          scoreEvents: { select: { sideId: true, metric: true, value: true } },
          sides: { select: { id: true, sideKey: true, score: true, participants: { select: { playerId: true, teamId: true, displayName: true, player: { select: { gamertag: true } }, team: { select: { name: true } } } } } },
        },
        orderBy: { endedAt: "asc" },
      },
    },
  });
  if (!tournament) notFound();
  const standings = calculateStandings(tournament.matches);
  const completedCount = tournament.matches.length;

  return <main className="page-shell"><div className="page-container max-w-6xl">
    <header className="mb-6 sm:mb-8">
      <Link href={`/tournaments/${tournament.id}`} className="page-kicker text-signal-live hover:underline">← {tournament.name}</Link>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="section-label">Competition table</p><h1 className="page-title mt-1">Standings</h1><p className="page-subtitle">{tournament.sport} · {tournament.game} · {completedCount} completed {completedCount === 1 ? "match" : "matches"}</p></div>
        {tournament.status === "LIVE" && <span className="status-live self-start sm:self-auto"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />Live</span>}
      </div>
      <nav aria-label="Tournament navigation" className="context-tabs mt-5">
        <Link href={`/tournaments/${tournament.id}`} className="context-tab">Overview</Link>
        <Link href={`/tournaments/${tournament.id}/standings`} aria-current="page" className="context-tab context-tab-active">Standings</Link>
        {tournament.status === "LIVE" && <Link href={`/multiview?tournamentId=${tournament.id}`} className="context-tab">Watch live</Link>}
      </nav>
    </header>

    {standings.length === 0 ? <section className="empty-state">
      <p className="page-kicker">No results yet</p>
      <h2 className="mt-2 font-display text-2xl uppercase tracking-wide">Standings will appear here</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Once completed matches are recorded, competitors will be ranked automatically.</p>
      <Link href={`/tournaments/${tournament.id}`} className="action-secondary mt-5">Back to competition</Link>
    </section> : <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-arena-700 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="section-label">Ranked competitors</p><p className="mt-1 text-sm text-ink-faint">Points and score difference update from completed matches.</p></div><span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{standings.length} competitors</span></div>
      <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead className="bg-arena-950"><tr className="text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint"><th className="px-4 py-3">#</th><th className="px-4 py-3">Competitor</th><th className="px-4 py-3">P</th><th className="px-4 py-3">W</th><th className="px-4 py-3">D</th><th className="px-4 py-3">L</th><th className="px-4 py-3">Pts</th><th className="px-4 py-3">For</th><th className="px-4 py-3">Against</th><th className="px-4 py-3">Diff</th></tr></thead><tbody>{standings.map((row)=><tr key={row.key} className="border-t border-arena-700"><td className="px-4 py-3 font-display text-lg">{row.rank}</td><td className="px-4 py-3 font-semibold">{row.label}</td><td className="px-4 py-3">{row.played}</td><td className="px-4 py-3">{row.wins}</td><td className="px-4 py-3">{row.draws}</td><td className="px-4 py-3">{row.losses}</td><td className="px-4 py-3 font-semibold">{row.points}</td><td className="px-4 py-3">{row.scoreFor}</td><td className="px-4 py-3">{row.scoreAgainst}</td><td className="px-4 py-3">{row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}</td></tr>)}</tbody></table></div>
    </section>}
  </div></main>;
}
