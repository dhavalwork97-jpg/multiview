"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecMatch = {
  id: string;
  playerOneScore: number;
  playerTwoScore: number;
  hypeScore: number | null;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  station: { label: string } | null;
};

export function RecommendedStrip() {
  const [becauseYouFollow, setBecauseYouFollow] = useState<RecMatch[]>([]);
  const [trending, setTrending] = useState<RecMatch[]>([]);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => {
        setBecauseYouFollow(data.becauseYouFollow);
        setTrending(data.trending);
      })
      .catch(() => {});
  }, []);

  if (becauseYouFollow.length === 0 && trending.length === 0) return null;

  return (
    <div className="space-y-4">
      {becauseYouFollow.length > 0 && (
        <MatchRow title="Because you follow" matches={becauseYouFollow} />
      )}
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
          <Link
            key={m.id}
            href={`/watch/${m.id}`}
            className="min-w-[200px] rounded-card border border-arena-600 bg-arena-800 p-3 text-sm hover:border-ink-faint"
          >
            <span className="text-corner-p1">
  {m.playerOne?.gamertag ?? "TBD"}
</span>
{" vs "}
<span className="text-corner-p2">
  {m.playerTwo?.gamertag ?? "TBD"}
</span>
            <div className="mt-1 text-xs text-ink-faint">{m.station?.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
