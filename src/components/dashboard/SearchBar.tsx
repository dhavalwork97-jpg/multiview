"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResults = {
  players: { id: string; gamertag: string; country: string | null }[];
  stations: { id: string; label: string; status: string; tournament: { slug: string; name: string } }[];
  tournaments: { id: string; name: string; slug: string; game: string }[];
};

const EMPTY: SearchResults = { players: [], stations: [], tournaments: [] };

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }

    // Debounce so we're not firing a search request on every keystroke.
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  const hasResults =
    results.players.length + results.stations.length + results.tournaments.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} // allow click to register first
        placeholder="Search players, stations, tournaments…"
        className="w-full rounded-card border border-arena-600 bg-arena-800 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ink-faint focus:outline-none"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-card border border-arena-600 bg-arena-800 shadow-xl">
          {!hasResults && (
            <p className="px-3 py-3 text-sm text-ink-faint">No matches for "{query}"</p>
          )}

          {results.players.length > 0 && (
            <ResultGroup label="Players">
              {results.players.map((p) => (
                <ResultRow
                  key={p.id}
                  primary={p.gamertag}
                  secondary={p.country ?? undefined}
                  onClick={() => router.push(`/players/${p.id}`)}
                />
              ))}
            </ResultGroup>
          )}

          {results.stations.length > 0 && (
            <ResultGroup label="Stations">
              {results.stations.map((s) => (
                <ResultRow
                  key={s.id}
                  primary={s.label}
                  secondary={s.tournament.name}
                  badge={s.status === "LIVE" ? "LIVE" : undefined}
                  onClick={() => router.push(`/tournaments/${s.tournament.slug}?station=${s.id}`)}
                />
              ))}
            </ResultGroup>
          )}

          {results.tournaments.length > 0 && (
            <ResultGroup label="Tournaments">
              {results.tournaments.map((t) => (
                <ResultRow
                  key={t.id}
                  primary={t.name}
                  secondary={t.game}
                  onClick={() => router.push(`/tournaments/${t.slug}`)}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  primary,
  secondary,
  badge,
  onClick,
}: {
  primary: string;
  secondary?: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={onClick} // onMouseDown fires before the input's onBlur closes the dropdown
      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-arena-700"
    >
      <span>
        {primary}
        {secondary && <span className="ml-2 text-ink-faint">{secondary}</span>}
      </span>
      {badge && (
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-signal-live">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />
          {badge}
        </span>
      )}
    </button>
  );
}
