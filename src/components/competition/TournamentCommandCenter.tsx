import Link from "next/link";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

type CommandMatch = {
  id: string;
  round: string | null;
  station: { label: string } | null;
  sides: Array<{ id: string; key: string; score: number; participants: Array<{ label: string }> }>;
};

type Props = {
  tournamentId: string;
  status: string;
  participantCount: number;
  matchCount: number;
  stageCount: number;
  liveMatch: CommandMatch | null;
  nextMatch: CommandMatch | null;
};

function matchup(match: CommandMatch | null) {
  if (!match) return "No scheduled match";
  return match.sides.map((side) => side.participants[0]?.label ?? side.key).join(" vs ");
}

export function TournamentCommandCenter({ tournamentId, status, participantCount, matchCount, stageCount, liveMatch, nextMatch }: Props) {
  const live = Boolean(liveMatch);
  return (
    <section className="surface-console relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-corner-p2/[.08] blur-[100px]" aria-hidden="true" />
      <div className="relative border-b border-arena-700 bg-arena-950/65 p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{live ? <LiveBadge /> : <span className="status-neutral">{status}</span>}<span className="status-neutral">Tournament signal</span></div><p className="mt-3 page-kicker">Live competition / command deck</p><h2 className="mt-1 font-display text-4xl uppercase tracking-tight sm:text-5xl">What&apos;s happening</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-faint">The competition at a glance: current matchup, next broadcast, field size and the routes that matter.</p></div>
          <div className="flex flex-wrap gap-2">{liveMatch && <Link href={`/watch/${liveMatch.id}`} className="action-primary min-h-11 px-5">Watch live</Link>}<Link href={`/tournaments/${tournamentId}/standings`} className="action-secondary">Standings</Link><Link href={`/multiview?tournamentId=${tournamentId}`} className="action-secondary">Multi-View</Link></div>
        </div>
      </div>
      <div className="relative grid gap-px bg-arena-700 sm:grid-cols-3">
        <div className="bg-arena-950/75 p-5"><p className="metric-label">Competitors</p><p className="mt-2 font-display text-4xl tabular-nums">{participantCount}</p><p className="mt-1 text-xs text-ink-faint">registered in this event</p></div>
        <div className="bg-arena-950/75 p-5"><p className="metric-label">On air</p><p className="mt-2 truncate font-display text-xl uppercase text-signal-live">{live ? matchup(liveMatch) : "Nothing live"}</p><p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{liveMatch?.round ?? "Awaiting next broadcast"}</p></div>
        <div className="bg-arena-950/75 p-5"><p className="metric-label">Next up</p><p className="mt-2 truncate font-display text-xl uppercase">{matchup(nextMatch)}</p><p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{nextMatch?.round ?? `${matchCount} matches · ${stageCount} stages`}</p></div>
      </div>
      <div className="relative p-4 sm:p-6"><SectionHeader eyebrow="Navigate the competition" title="Follow the story" /><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Link href={`/tournaments/${tournamentId}/standings`} className="surface-quiet surface-card-interactive p-4"><span className="section-label">Leaderboard</span><p className="mt-2 font-display uppercase">Who is winning</p><p className="mt-1 text-xs text-ink-faint">Standings, placement and form.</p></Link><Link href={`/tournaments/${tournamentId}`} className="surface-quiet surface-card-interactive p-4"><span className="section-label">Schedule</span><p className="mt-2 font-display uppercase">What&apos;s next</p><p className="mt-1 text-xs text-ink-faint">Upcoming matches and stages.</p></Link><Link href={`/multiview?tournamentId=${tournamentId}`} className="surface-quiet surface-card-interactive p-4"><span className="section-label">Broadcast</span><p className="mt-2 font-display uppercase">Where to watch</p><p className="mt-1 text-xs text-ink-faint">Live stations and Multi-View.</p></Link><Link href={`/tournaments/${tournamentId}/standings`} className="surface-quiet surface-card-interactive p-4"><span className="section-label">Format</span><p className="mt-2 font-display uppercase">How it works</p><p className="mt-1 text-xs text-ink-faint">Brackets, stages and results.</p></Link></div></div>
    </section>
  );
}
