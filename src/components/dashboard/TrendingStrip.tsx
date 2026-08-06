"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TrendingMatch = {
  id: string;
  playerOneScore: number;
  playerTwoScore: number;
  hypeScore: number | null;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
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

  useEffect(() => {
    fetch("/api/matches/trending")
      .then((r) => r.json())
      .then((data) => setMatches(data.matches))
      .catch(() => {});
  }, []);

  if (matches.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {matches.map((m) => (
        <Link
          key={m.id}
          href={`/watch/${m.id}`}
          className="min-w-[220px] rounded-card border border-arena-600 bg-arena-800 p-3 text-sm hover:border-ink-faint"
        >
          <div className="flex items-center justify-between">
            <span>
              <span className="text-corner-p1">{m.playerOne.gamertag}</span>
              {" vs "}
              <span className="text-corner-p2">{m.playerTwo.gamertag}</span>
            </span>
            <span className="font-mono text-xs text-signal-warn">{m.hypeScore ?? 0}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-ink-faint">
            <span>{m.station?.label}</span>
            <span className="font-mono">{m.playerOneScore}–{m.playerTwoScore}</span>
          </div>
          {m.events[0] && (
            <span className="mt-1 inline-block text-xs text-signal-live">
              {EVENT_LABEL[m.events[0].type]}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
