import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      matchesAsP1: { include: { playerTwo: true, tournament: true }, orderBy: { updatedAt: "desc" }, take: 20 },
      matchesAsP2: { include: { playerOne: true, tournament: true }, orderBy: { updatedAt: "desc" }, take: 20 },
    },
  });
  if (!player) notFound();
  const teamMemberships = await db.teamMember.findMany({ where: { playerId: player.id }, include: { team: true } });
  const matches = [
    ...player.matchesAsP1.map((match) => ({ ...match, opponent: match.playerTwo, playerScore: match.playerOneScore, opponentScore: match.playerTwoScore })),
    ...player.matchesAsP2.map((match) => ({ ...match, opponent: match.playerOne, playerScore: match.playerTwoScore, opponentScore: match.playerOneScore })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 20);
  const wins = matches.filter((m) => m.playerScore > m.opponentScore).length;
  const losses = matches.filter((m) => m.playerScore < m.opponentScore).length;
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="page-container mx-auto max-w-6xl space-y-8">
        <section className="player-hero relative overflow-hidden rounded-[22px] border border-arena-600 bg-[radial-gradient(circle_at_82%_12%,rgba(95,45,255,.28),transparent_32%),radial-gradient(circle_at_12%_90%,rgba(0,207,255,.12),transparent_30%),linear-gradient(135deg,#071025,#030712)] p-5 shadow-elevated sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-broadcast-grid bg-[length:42px_42px] opacity-25" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="status-neutral">PLAYER PROFILE</span></div>
              <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[.24em] text-ink-faint">FGC / competitor identity</p>
              <h1 className="mt-2 font-display text-5xl uppercase leading-[.88] tracking-[.015em] text-ink sm:text-7xl lg:text-8xl">{player.gamertag}</h1>
              {player.realName && <p className="mt-3 text-sm text-ink-muted sm:text-base">{player.realName}</p>}
              <div className="mt-5 flex flex-wrap gap-2">{teamMemberships.map((m) => <Link key={m.teamId} href={`/teams/${m.teamId}`} className="action-secondary">{m.team.name}</Link>)}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
              <div className="player-stat surface-quiet p-4"><p className="metric-label">Matches</p><p className="ds-number mt-2 text-3xl">{matches.length}</p></div>
              <div className="player-stat surface-quiet p-4"><p className="metric-label">Win rate</p><p className="ds-number mt-2 text-3xl text-signal-live">{winRate}%</p></div>
              <div className="player-stat surface-quiet p-4"><p className="metric-label">Record</p><p className="ds-number mt-2 text-3xl">{wins}-{losses}</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
          <div className="surface-card overflow-hidden p-5 sm:p-7">
            <div className="ds-section-header"><div><p className="ds-index">01 / performance</p><h2 className="section-heading">Competitive profile</h2></div><span className="status-neutral">LAST 20</span></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="player-stat surface-quiet p-5"><p className="metric-label">Victories</p><p className="ds-number mt-2 text-4xl">{wins}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-arena-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${winRate}%` }} /></div></div>
              <div className="player-stat surface-quiet p-5"><p className="metric-label">Losses</p><p className="ds-number mt-2 text-4xl">{losses}</p><p className="mt-2 text-xs text-ink-faint">recorded matches</p></div>
              <div className="player-stat surface-quiet p-5"><p className="metric-label">Recent form</p><div className="mt-3 flex gap-1.5">{matches.slice(0, 5).map((m) => <span key={m.id} className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold ${m.playerScore > m.opponentScore ? "bg-signal-live/15 text-signal-live" : "bg-rose-500/15 text-rose-300"}`}>{m.playerScore > m.opponentScore ? "W" : "L"}</span>)}</div></div>
            </div>
          </div>
          <div className="surface-signal overflow-hidden p-5 sm:p-7"><p className="section-label">Rank progression</p><div className="mt-4 flex items-end justify-between gap-4"><div><p className="font-display text-5xl uppercase text-ink">Elite</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.18em] text-ink-faint">Competitive tier</p></div><div className="grid h-20 w-20 place-items-center rounded-full border border-violet-400/40 bg-violet-500/10 shadow-[0_0_35px_rgba(95,45,255,.22)]"><span className="font-display text-2xl text-violet-200">{winRate}</span></div></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-arena-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400" style={{ width: `${Math.max(8, winRate)}%` }} /></div><div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-ink-faint"><span>Current</span><span>Next tier</span></div></div>
        </section>

        <section><div className="ds-section-header"><div><p className="ds-index">02 / competition</p><h2 className="section-heading">Match history</h2></div><span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">20 latest</span></div><div className="surface-card overflow-hidden"><div className="hidden grid-cols-[80px_1fr_180px_100px] gap-4 border-b border-arena-700 bg-arena-950/50 px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-faint sm:grid"><span>Result</span><span>Opponent</span><span>Tournament</span><span>Score</span></div>{matches.length === 0 ? <div className="empty-state">No recorded matches yet.</div> : matches.map((m) => { const won = m.playerScore > m.opponentScore; return <Link key={m.id} href={`/watch/${m.id}`} className="grid gap-2 border-b border-arena-800 px-5 py-4 transition hover:bg-violet-500/[.04] sm:grid-cols-[80px_1fr_180px_100px] sm:items-center"><span className={won ? "status-live w-fit" : "status-neutral w-fit"}>{won ? "WIN" : m.playerScore < m.opponentScore ? "LOSS" : "DRAW"}</span><span><span className="font-display text-xl uppercase">{m.opponent?.gamertag ?? "Unknown opponent"}</span><span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Watch match →</span></span><span className="truncate text-xs text-ink-muted">{m.tournament?.name ?? "Tournament"}</span><span className="font-mono text-sm text-ink">{m.playerScore} — {m.opponentScore}</span></Link>; })}</div></section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="surface-card p-5"><p className="section-label">Identity</p><h3 className="mt-2 font-display text-2xl uppercase">Player ID</h3><p className="mt-3 break-all font-mono text-[9px] text-ink-faint">{player.id}</p></div><div className="surface-card p-5"><p className="section-label">Teams</p><h3 className="mt-2 font-display text-2xl uppercase">Affiliations</h3><p className="mt-3 font-mono text-xs text-ink-muted">{teamMemberships.length} active {teamMemberships.length === 1 ? "roster" : "rosters"}</p></div><Link href="/players" className="surface-card surface-card-interactive p-5"><p className="section-label">Directory</p><h3 className="mt-2 font-display text-2xl uppercase">All players</h3><p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Back to directory →</p></Link></section>
      </div>
    </main>
  );
}
