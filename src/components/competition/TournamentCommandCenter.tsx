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

export function TournamentCommandCenter({
  tournamentId,
  status,
  participantCount,
  matchCount,
  stageCount,
  liveMatch,
  nextMatch,
}: Props) {
  const live = Boolean(liveMatch);

  return (
    <section className="surface-card overflow-hidden border-signal-live/20">
      <div className="border-b border-arena-800 bg-arena-950/80 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {live ? <LiveBadge /> : <span className="status-neutral">{status}</span>}
              <span className="status-neutral">Command center</span>
            </div>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-tight sm:text-3xl">What&apos;s happening</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-faint">
              One glance for the live match, what&apos;s next, the competition field, and the fastest route into the broadcast.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {liveMatch && <Link href={`/watch/${liveMatch.id}`} className="action-primary">Watch live</Link>}
            <Link href={`/tournaments/${tournamentId}/standings`} className="action-secondary">Standings</Link>
            <Link href={`/multiview?tournamentId=${tournamentId}`} className="action-secondary">Multi-View</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-arena-800 sm:grid-cols-3">
        <div className="bg-arena-950/70 p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Who is playing</p>
          <p className="mt-2 font-display text-2xl">{participantCount}</p>
          <p className="mt-1 text-xs text-ink-faint">registered competitors</p>
        </div>
        <div className="bg-arena-950/70 p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">What&apos;s live</p>
          <p className="mt-2 truncate font-display text-lg uppercase">{live ? matchup(liveMatch) : "Nothing live"}</p>
          <p className="mt-1 text-xs text-ink-faint">{liveMatch?.round ?? "Waiting for the next broadcast"}</p>
        </div>
        <div className="bg-arena-950/70 p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">What&apos;s next</p>
          <p className="mt-2 truncate font-display text-lg uppercase">{matchup(nextMatch)}</p>
          <p className="mt-1 text-xs text-ink-faint">{nextMatch?.round ?? `${matchCount} total matches · ${stageCount} stages`}</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <SectionHeader eyebrow="Navigate the competition" title="Follow the story" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/tournaments/${tournamentId}/standings`} className="surface-card surface-card-interactive p-4">
            <span className="section-label">Leaderboard</span>
            <p className="mt-2 font-display uppercase">Who is winning</p>
            <p className="mt-1 text-xs text-ink-faint">Standings, placement, and form.</p>
          </Link>
          <Link href={`/tournaments/${tournamentId}`} className="surface-card surface-card-interactive p-4">
            <span className="section-label">Schedule</span>
            <p className="mt-2 font-display uppercase">What&apos;s next</p>
            <p className="mt-1 text-xs text-ink-faint">Upcoming matches and stages.</p>
          </Link>
          <Link href={`/multiview?tournamentId=${tournamentId}`} className="surface-card surface-card-interactive p-4">
            <span className="section-label">Broadcast</span>
            <p className="mt-2 font-display uppercase">Where to watch</p>
            <p className="mt-1 text-xs text-ink-faint">Live stations and Multi-View.</p>
          </Link>
          <Link href={`/tournaments/${tournamentId}/standings`} className="surface-card surface-card-interactive p-4">
            <span className="section-label">Competition</span>
            <p className="mt-2 font-display uppercase">How it works</p>
            <p className="mt-1 text-xs text-ink-faint">Brackets, stages, and results.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
