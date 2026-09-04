"use client";

import Link from "next/link";
import { CompetitionScoreboard } from "@/components/competition/CompetitionScoreboard";
import { useCompetitionViewerState } from "@/hooks/useCompetitionViewerState";
import type { CompetitionViewerState } from "@/lib/competition/viewer-state";

export function UniversalLiveViewer({
  tournamentId,
  initialState,
}: {
  tournamentId: string;
  initialState: CompetitionViewerState;
}) {
  const { state, refreshing, refreshError, lastUpdatedAt, connected, refresh } =
    useCompetitionViewerState(tournamentId, initialState);

  const primaryLiveMatch =
    state.live.matches.find((match) => match.id === state.live.primaryMatchId) ??
    state.live.matches[0];

  return (
    <div className="space-y-8">
      <section className="rounded-card border border-arena-600 bg-arena-900 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Broadcast floor</p>
            <h2 className="font-display text-xl uppercase tracking-wide">Live now</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <span className={connected ? "status-live" : "status-neutral"}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-signal-live animate-live-pulse" : "bg-ink-faint"}`} />
              {connected ? "Live connection" : "Reconnecting"}
            </span>
            {refreshing && <span className="font-mono text-[10px] uppercase text-ink-faint">Updating</span>}
            <span className="font-mono text-[10px] uppercase text-ink-faint">{state.live.matches.length} active</span>
          </div>
        </div>

        {refreshError && (
          <div className="mb-4 flex flex-col gap-3 rounded-card border border-signal-live/30 bg-arena-950 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-xs text-ink-muted">Live data could not be refreshed. The displayed scores may be out of date.</p>
            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="action-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
              Retry update
            </button>
          </div>
        )}

        <p className="mb-4 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
          Last checked {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>

        {!primaryLiveMatch ? (
          <div className="rounded-card border border-dashed border-arena-600 p-6 text-center">
            <p className="font-display text-lg uppercase">No matches live</p>
            <p className="mt-1 text-sm text-ink-faint">Check upcoming matches and standings below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Link href={`/watch/${primaryLiveMatch.id}`} className="block rounded-card border border-signal-live/40 bg-arena-950 p-4 transition-colors hover:border-signal-live">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-signal-live"><span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-signal-live" />Live</span>
                <span className="font-mono text-[10px] uppercase text-ink-faint">{primaryLiveMatch.station?.label ?? "Station"}</span>
              </div>
              <div className="mt-4"><CompetitionScoreboard sides={primaryLiveMatch.sides} /></div>
              {primaryLiveMatch.round && <p className="mt-3 text-xs text-ink-faint">{primaryLiveMatch.round} · Watch live</p>}
            </Link>
            {state.live.matches.length > 1 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {state.live.matches.filter((match) => match.id !== primaryLiveMatch.id).map((match) => (
                  <Link key={match.id} href={`/watch/${match.id}`} className="rounded-card border border-arena-700 bg-arena-950 p-3 hover:border-signal-live">
                    <CompetitionScoreboard sides={match.sides} compact />
                    <p className="mt-2 font-mono text-[10px] uppercase text-ink-faint">{match.round ?? "Live match"} · {match.station?.label ?? "Station"}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {state.upcoming.length > 0 && (
        <section>
          <div className="mb-3"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Next up</p><h2 className="font-display text-xl uppercase tracking-wide">Upcoming matches</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{state.upcoming.slice(0, 6).map((match) => <Link key={match.id} href={`/watch/${match.id}`} className="rounded-card border border-arena-700 bg-arena-900 p-4 hover:border-signal-live"><CompetitionScoreboard sides={match.sides} compact /><p className="mt-3 font-mono text-[10px] uppercase text-ink-faint">{match.round ?? "Upcoming match"}</p></Link>)}</div>
        </section>
      )}

      {state.standings.length > 0 && (
        <section className="rounded-card border border-arena-600 bg-arena-900 p-4 sm:p-5"><div className="mb-4"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Competition</p><h2 className="font-display text-xl uppercase tracking-wide">Standings</h2></div><div className="divide-y divide-arena-700">{state.standings.slice(0, 8).map((standing) => <div key={standing.key} className="flex items-center justify-between gap-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="w-6 shrink-0 font-mono text-ink-faint">{standing.rank}</span><span className="truncate font-display uppercase">{standing.label}</span></div><div className="flex shrink-0 items-center gap-4 font-mono text-sm"><span className="text-ink-faint">{standing.wins}-{standing.losses}</span><span>{standing.points} pts</span></div></div>)}</div></section>
      )}

      {state.recentResults.length > 0 && (
        <section className="rounded-card border border-arena-600 bg-arena-900 p-4 sm:p-5"><div className="mb-4"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Results</p><h2 className="font-display text-xl uppercase tracking-wide">Recent matches</h2></div><div className="divide-y divide-arena-700">{state.recentResults.slice(0, 8).map((match) => <Link key={match.id} href={`/watch/${match.id}`} className="block py-3 hover:text-signal-live"><CompetitionScoreboard sides={match.sides} compact /><p className="mt-1 font-mono text-[10px] uppercase text-ink-faint">{match.round ?? "Completed match"} · {match.station?.label ?? "Station"}</p></Link>)}</div></section>
      )}
    </div>
  );
}
