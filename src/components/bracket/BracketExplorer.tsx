"use client";

import { useState } from "react";
import { InteractiveBracket } from "./InteractiveBracket";
import { BracketWatchDock, type DockMatch } from "@/components/watch/BracketWatchDock";

type BracketSummary = { id: string; name: string };

// Viewer-facing bracket page: every station keeps streaming in the
// background regardless of what's picked here (see StreamingArchitecture)
// — this component only decides which one gets shown, by keeping the
// selected match id local rather than letting the bracket navigate away.
// With N players in a single-elim bracket that's N/2 simultaneous games;
// clicking a different bracket node just swaps the dock's source, same as
// clicking a different tile would in a channel guide.
export function BracketExplorer({
  brackets,
  tournamentId,
}: {
  brackets: BracketSummary[];
  // Optional so nothing breaks if a future caller doesn't have it handy —
  // but without it, InteractiveBracket has no room to listen on and a
  // completed match won't visibly advance the bracket until the page is
  // refreshed.
  tournamentId?: string;
}) {
  const [activeBracketId, setActiveBracketId] = useState<string | null>(brackets[0]?.id ?? null);
  const [selectedMatch, setSelectedMatch] = useState<DockMatch | null>(null);

  if (!activeBracketId) {
    return <p className="text-sm text-ink-faint">No bracket published yet.</p>;
  }

  return (
    <div>
      {brackets.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {brackets.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveBracketId(b.id)}
              className={`rounded-card border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors ${
                b.id === activeBracketId
                  ? "border-signal-live text-signal-live"
                  : "border-arena-600 text-ink-faint hover:text-ink"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <p className="mb-3 text-xs text-ink-faint">
        Click any live match to watch it here — pick a different one anytime, every station keeps
        streaming in the background.
      </p>

      <InteractiveBracket
        bracketId={activeBracketId}
        tournamentId={tournamentId}
        selectedMatchId={selectedMatch?.id ?? null}
        onWatch={setSelectedMatch}
      />

      <BracketWatchDock match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </div>
  );
}
