import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { calculateStandings } from "@/lib/standings-engine";
import { TournamentAdminNav } from "@/components/admin/TournamentAdminNav";

export default async function StandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentManage(tournamentId); } catch { return notFound(); }
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true, slug: true, name: true, sport: true, game: true, format: true,
      matches: {
        where: { status: "COMPLETED" },
        select: {
          id: true, status: true, playerOneScore: true, playerTwoScore: true, winnerSideId: true, rulesSnapshot: true,
          sides: { select: { id: true, sideKey: true, score: true, participants: { select: { playerId: true, teamId: true, displayName: true, player: { select: { gamertag: true } }, team: { select: { name: true } } } } } },
        },
        orderBy: { endedAt: "asc" },
      },
    },
  });
  if (!tournament) notFound();
  const standings = calculateStandings(tournament.matches);
  return <main className="min-h-screen bg-arena-950 px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl">
    <TournamentAdminNav tournamentId={tournament.id} slug={tournament.slug} />
    <div className="mt-6 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">Universal standings</p><h1 className="mt-1 font-display text-3xl uppercase">{tournament.name}</h1><p className="mt-1 text-sm text-ink-faint">Calculated from completed generic matches · {tournament.sport} · {tournament.game}</p></div><Link href={`/admin/tournaments/${tournament.id}/matches`} className="action-primary">Open scoring</Link></div>
    <section className="mt-6 overflow-x-auto rounded-card border border-arena-700 bg-arena-900"><table className="min-w-[900px] w-full text-sm"><thead className="bg-arena-950"><tr className="text-left font-mono text-[10px] uppercase text-ink-faint"><th className="px-4 py-3">#</th><th className="px-4 py-3">Competitor</th><th className="px-4 py-3">P</th><th className="px-4 py-3">W</th><th className="px-4 py-3">D</th><th className="px-4 py-3">L</th><th className="px-4 py-3">Pts</th><th className="px-4 py-3">For</th><th className="px-4 py-3">Against</th><th className="px-4 py-3">Diff</th><th className="px-4 py-3">Win %</th></tr></thead><tbody>{standings.map(row=><tr key={row.key} className="border-t border-arena-700"><td className="px-4 py-3 font-display text-lg">{row.rank}</td><td className="px-4 py-3"><p className="font-semibold">{row.label}</p><p className="font-mono text-[10px] uppercase text-ink-faint">{row.participantType}</p></td><td className="px-4 py-3">{row.played}</td><td className="px-4 py-3">{row.wins}</td><td className="px-4 py-3">{row.draws}</td><td className="px-4 py-3">{row.losses}</td><td className="px-4 py-3 font-semibold">{row.points}</td><td className="px-4 py-3">{row.scoreFor}</td><td className="px-4 py-3">{row.scoreAgainst}</td><td className="px-4 py-3">{row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}</td><td className="px-4 py-3">{Math.round(row.winRate * 100)}%</td></tr>)}{standings.length===0&&<tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-ink-faint">No completed matches yet.</td></tr>}</tbody></table></section>
    <p className="mt-3 text-xs text-ink-faint">Default ranking: points → wins → score difference → score for → name. Football-style 3/1/0 rules are honored when present in the match rules snapshot.</p>
  </div></main>;
}
