import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { calculateStandings } from "@/lib/standings-engine";

export default async function PublicStandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true, name: true, slug: true, sport: true, game: true,
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
  return <main className="min-h-screen bg-arena-950 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl">
    <Link href={`/tournaments/${tournament.id}`} className="font-mono text-xs uppercase text-ink-faint hover:text-signal-live">← {tournament.name}</Link>
    <header className="mt-4"><p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">Live competition table</p><h1 className="mt-1 font-display text-4xl uppercase">Standings</h1><p className="mt-1 text-sm text-ink-faint">{tournament.sport} · {tournament.game}</p></header>
    <section className="mt-6 overflow-x-auto rounded-card border border-arena-700 bg-arena-900"><table className="min-w-[850px] w-full text-sm"><thead className="bg-arena-950"><tr className="text-left font-mono text-[10px] uppercase text-ink-faint"><th className="px-4 py-3">#</th><th className="px-4 py-3">Competitor</th><th className="px-4 py-3">P</th><th className="px-4 py-3">W</th><th className="px-4 py-3">D</th><th className="px-4 py-3">L</th><th className="px-4 py-3">Pts</th><th className="px-4 py-3">For</th><th className="px-4 py-3">Against</th><th className="px-4 py-3">Diff</th></tr></thead><tbody>{standings.map(row=><tr key={row.key} className="border-t border-arena-700"><td className="px-4 py-3 font-display text-lg">{row.rank}</td><td className="px-4 py-3 font-semibold">{row.label}</td><td className="px-4 py-3">{row.played}</td><td className="px-4 py-3">{row.wins}</td><td className="px-4 py-3">{row.draws}</td><td className="px-4 py-3">{row.losses}</td><td className="px-4 py-3 font-semibold">{row.points}</td><td className="px-4 py-3">{row.scoreFor}</td><td className="px-4 py-3">{row.scoreAgainst}</td><td className="px-4 py-3">{row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}</td></tr>)}{standings.length===0&&<tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-faint">No completed matches yet.</td></tr>}</tbody></table></section>
  </div></main>;
}
