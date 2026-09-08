"use client";

import Link from "next/link";

export default function TournamentError({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <div className="page-container max-w-3xl">
        <section className="surface-console relative overflow-hidden p-6 sm:p-8" aria-labelledby="tournament-error-title">
          <div className="pointer-events-none absolute inset-0 bg-broadcast-grid opacity-40" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-signal-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-warn" />
              Event signal interrupted
            </div>
            <h1 id="tournament-error-title" className="mt-4 font-display text-4xl uppercase tracking-tight text-ink sm:text-5xl">
              Tournament view unavailable
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
              The tournament data could not be loaded right now. Nothing has been changed; try the request again or return to the competition index.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={reset} className="action-primary">
                Retry
              </button>
              <Link href="/tournaments" className="action-secondary">
                All tournaments
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
