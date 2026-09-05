"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecMatch = {
  id: string;
  playerOneScore: number;
  playerTwoScore: number;
  hypeScore: number | null;
  playerOne: { gamertag: string } | null;
  playerTwo: { gamertag: string } | null;
  station: { label: string } | null;
};

export function RecommendedStrip() {
  const [becauseYouFollow, setBecauseYouFollow] = useState<RecMatch[]>([]);
  const [trending, setTrending] = useState<RecMatch[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/recommendations", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load recommendations");
        const data: unknown = await response.json();
        const payload = data && typeof data === "object" ? data as { becauseYouFollow?: unknown; trending?: unknown } : {};
        if (!cancelled) {
          setBecauseYouFollow(Array.isArray(payload.becauseYouFollow) ? payload.becauseYouFollow as RecMatch[] : []);
          setTrending(Array.isArray(payload.trending) ? payload.trending as RecMatch[] : []);
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
    return <p className="text-sm text-ink-muted" role="status">Recommendations are temporarily unavailable.</p>;
  }

  if (becauseYouFollow.length === 0 && trending.length === 0) return null;

  return (
    <div className="space-y-4">
      {becauseYouFollow.length > 0 && <MatchRow title="Because you follow" matches={becauseYouFollow} />}
      {trending.length > 0 && <MatchRow title="You might like" matches={trending} />}
    </div>
  );
}

function MatchRow({ title, matches }: { title: string; matches: RecMatch[] }) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-faint">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {matches.map((m) => (
          <Link key={m.id} href={`/watch/${m.id}`} className="min-w-[200px] rounded-card border border-arena-600 bg-arena-800 p-3 text-sm hover:border-ink-faint">
            <span className="text-corner-p1">{m.playerOne?.gamertag ?? "TBD"}</span>{" vs "}<span className="text-corner-p2">{m.playerTwo?.gamertag ?? "TBD"}</span>
            <div className="mt-1 text-xs text-ink-faint">{m.station?.label ?? "Station TBD"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
