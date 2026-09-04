import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { calculateStandings } from "@/lib/standings-engine";

export default async function PublicStandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true, name: true, slug: true, sport: true, game: true, format: true,
      participantMode: true, scoringMode: true, status: true, startDate: true,
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
  const isBattleRoyale = tournament.sport === "bgmi" || tournament.scoringMode === "battle_royale";
  const participantLabel = tournament.participantMode === "team" ? "Teams" : "Entrants";
  const completedMatches = tournament.matches.length;

  return (
    <main className="page-shell">
      <div className="page-container max-w-6xl">
        <Link href={`/tournaments/${tournament.id}`} className="font-mono text-xs uppercase text-ink-faint hover:text-signal-live">← {tournament.name}</Link>

        <header className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-kicker text-signal-live">Competition table</p>
              <h1 className="page-title mt-1">Standings</h1>
              <p className="page-subtitle mt-1">{tournament.sport} · {tournament.game} · {tournament.status}</p>
            </div>
            <Link href={`/tournaments/${tournament.id}`} className="action-secondary self-start sm:self-auto">Tournament overview</Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-arena-700 bg-arena-700 sm:grid-cols-4">
            {[
              ["Format", tournament.format ?? "Standard"],
              ["Scoring", isBattleRoyale ? "Battle Royale" : "Match points"],
              [participantLabel, standings.length > 0 ? String(standings.length) : "—"],
              ["Completed", String(completedMatches)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-arena-950/70 px-3 py-2.5">
                <span className="block font-mono text-[9px] uppercase tracking-widest text-ink-faint">{label}</span>
                <span className="mt-1 block truncate text-sm text-ink-muted">{value}</span>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-6 overflow-x-auto rounded-card border border-arena-700 bg-arena-900">
          <table className="min-w-[850px] w-full text-sm">
            <thead className="bg-arena-950">
              <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Competitor</th>
                <th className="px-4 py-3">P</th>
                <th className="px-4 py-3">W</th>
                <th className="px-4 py-3">D</th>
                <th className="px-4 py-3">L</th>
                <th className="px-4 py-3">Pts</th>
                {isBattleRoyale ? <>
                  <th className="px-4 py-3">Kills</th>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Wins</th>
                </> : <>
                  <th className="px-4 py-3">For</th>
                  <th className="px-4 py-3">Against</th>
                  <th className="px-4 py-3">Diff</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.key} className="border-t border-arena-700">
                  <td className="px-4 py-3 font-display text-lg">{row.rank}</td>
                  <td className="max-w-[260px] px-4 py-3 font-semibold text-ink">
                    <span className="block truncate">{row.label}</span>
                    <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-widest text-ink-faint">{row.participantType}</span>
                  </td>
                  <td className="px-4 py-3">{row.played}</td>
                  <td className="px-4 py-3">{row.wins}</td>
                  <td className="px-4 py-3">{row.draws}</td>
                  <td className="px-4 py-3">{row.losses}</td>
                  <td className="px-4 py-3 font-semibold text-signal-live">{row.points}</td>
                  {isBattleRoyale ? <>
                    <td className="px-4 py-3">{row.kills}</td>
                    <td className="px-4 py-3">{row.placementPoints}</td>
                    <td className="px-4 py-3">{row.firstPlaceFinishes}</td>
                  </> : <>
                    <td className="px-4 py-3">{row.scoreFor}</td>
                    <td className="px-4 py-3">{row.scoreAgainst}</td>
                    <td className="px-4 py-3">{row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}</td>
                  </>}
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={isBattleRoyale ? 10 : 10} className="px-4 py-12 text-center">
                    <p className="font-display text-xl uppercase">No completed matches yet</p>
                    <p className="mt-2 text-sm text-ink-faint">Standings will populate automatically once competition results are recorded.</p>
                    <Link href={`/tournaments/${tournament.id}`} className="action-secondary mt-4 inline-flex">Back to tournament</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="mt-3 text-xs leading-5 text-ink-faint">
          {isBattleRoyale
            ? "Battle Royale ranking uses total points, then first-place finishes, placement points and kills as tie-breakers."
            : "Ranking uses points first, followed by wins and score difference when competitors are tied."}
        </p>
      </div>
    </main>
  );
}
