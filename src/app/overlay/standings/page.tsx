import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { calculateStandings } from "@/lib/standings-engine";

export default async function StandingsOverlayPage({ searchParams }: { searchParams: Promise<{ tournamentId?: string }> }) {
  const { tournamentId } = await searchParams;
  if (!tournamentId) notFound();

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      sport: true,
      game: true,
      scoringMode: true,
      matches: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          status: true,
          playerOneScore: true,
          playerTwoScore: true,
          winnerSideId: true,
          rulesSnapshot: true,
          scoreEvents: { select: { sideId: true, metric: true, value: true } },
          sides: {
            select: {
              id: true,
              sideKey: true,
              score: true,
              participants: {
                select: {
                  playerId: true,
                  teamId: true,
                  displayName: true,
                  player: { select: { gamertag: true } },
                  team: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { endedAt: "asc" },
      },
    },
  });
  if (!tournament) notFound();

  const standings = calculateStandings(tournament.matches).slice(0, 10);
  const isBattleRoyale = tournament.sport === "bgmi" || tournament.scoringMode === "battle_royale";

  return (
    <main className="min-h-screen bg-transparent p-6 text-white">
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.24em] text-violet-300">FGC LIVE · {tournament.game}</p>
            <h1 className="mt-1 font-display text-2xl uppercase tracking-wide">{tournament.name}</h1>
          </div>
          <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-red-300">Live</span>
        </header>
        <div className="grid grid-cols-[44px_minmax(0,1fr)_70px_70px] border-b border-white/10 px-5 py-2 font-mono text-[9px] uppercase tracking-widest text-white/40">
          <span>#</span><span>Competitor</span><span className="text-right">Pts</span><span className="text-right">{isBattleRoyale ? "Kills" : "W"}</span>
        </div>
        {standings.map((row) => (
          <div key={row.key} className="grid grid-cols-[44px_minmax(0,1fr)_70px_70px] items-center border-b border-white/5 px-5 py-3 last:border-0">
            <span className="font-display text-xl text-white/50">{row.rank}</span>
            <span className="truncate pr-3 font-semibold">{row.label}</span>
            <span className="text-right font-display text-xl text-violet-300">{row.points}</span>
            <span className="text-right font-mono text-sm text-white/70">{isBattleRoyale ? row.kills : row.wins}</span>
          </div>
        ))}
        {standings.length === 0 && <div className="px-5 py-10 text-center font-mono text-xs uppercase tracking-widest text-white/40">Waiting for results</div>}
      </section>
    </main>
  );
}
