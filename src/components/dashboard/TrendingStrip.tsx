"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TrendingMatch = {
  id: string;
  playerOneScore: number;
  playerTwoScore: number;
  hypeScore: number | null;
  playerOne: { gamertag: string } | null;
  playerTwo: { gamertag: string } | null;
  station: { label: string } | null;
  events: { type: "COMEBACK" | "PERFECT_ROUND" | "HYPE_SPIKE" }[];
};

const EVENT_LABEL: Record<string, string> = {
  COMEBACK: "🔄 Comeback",
  PERFECT_ROUND: "⭐ Perfect round",
  HYPE_SPIKE: "🔥 Hype",
};

export function TrendingStrip() {
  const [matches, setMatches] = useState<TrendingMatch[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/matches/trending", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load trending matches");
        const data: unknown = await response.json();
        const payload = data && typeof data === "object" ? data as { matches?: unknown } : {};
        if (!cancelled) {
          setMatches(Array.isArray(payload.matches) ? payload.matches as TrendingMatch[] : []);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <p className="text-sm text-ink-muted" role="status">Trending matches are temporarily unavailable.</p>;
  }

  if (matches.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {matches.map((m) => (
        <Link key={m.id} href={`/watch/${m.id}`} className="min-w-[220px] rounded-card border border-arena-600 bg-arena-800 p-3 text-sm hover:border-ink-faint">
          <div className="flex items-center justify-between">
            <span><span className="text-corner-p1">{m.playerOne?.gamertag ?? "TBD"}</span>{" vs "}<span className="text-corner-p2">{m.playerTwo?.gamertag ?? "TBD"}</span></span>
            <span className="font-mono text-xs text-signal-warn">{m.hypeScore ?? 0}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-ink-faint">
            <span>{m.station?.label ?? "Station TBD"}</span>
            <span className="font-mono">{m.playerOneScore}–{m.playerTwoScore}</span>
          </div>
          {m.events?.[0] && <span className="mt-1 inline-block text-xs text-signal-live">{EVENT_LABEL[m.events[0].type] ?? "Live signal"}</span>}
        </Link>
      ))}
    </div>
  );
}
