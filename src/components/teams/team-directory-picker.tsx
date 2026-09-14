"use client";

import { useEffect, useState } from "react";

type Team = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  country?: string | null;
  members?: { player: { gamertag: string } }[];
};

export function TeamDirectoryPicker({ tournamentId }: { tournamentId: string }) {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/teams?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setTeams(data.teams ?? []);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function addTeam(teamId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add team");
      setSelected((current) => [...current, teamId]);
      setMessage(`${data.team.name} added to this tournament.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add team");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-arena-700 bg-arena-900 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl uppercase">Add from FGC Directory</h2>
          <p className="mt-1 text-sm text-ink-faint">Search existing teams instead of rebuilding rosters every tournament.</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Liquipedia-style</span>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search team name or tag…"
          className="min-w-0 flex-1 rounded-md border border-arena-700 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <a href="/teams" className="action-secondary shrink-0">Browse directory</a>
      </div>

      <div className="mt-4 grid gap-2">
        {teams.map((team) => {
          const added = selected.includes(team.id);
          return (
            <div key={team.id} className="flex items-center gap-3 rounded-md border border-arena-700 bg-arena-950/60 p-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-arena-700 bg-arena-900">
                {team.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.logoUrl} alt={`${team.name} logo`} className="h-full w-full object-contain p-1" loading="lazy" />
                ) : (
                  <span className="font-display text-lg text-ink-faint">{team.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{team.name}</span>
                  {team.country && <span className="font-mono text-[10px] uppercase text-ink-faint">{team.country}</span>}
                </div>
                <p className="truncate text-xs text-ink-faint">
                  {team.members?.length ? `${team.members.length} roster members` : "Roster not added yet"}
                </p>
              </div>
              <button disabled={busy || added} onClick={() => addTeam(team.id)} className="action-primary shrink-0 disabled:opacity-50">
                {added ? "Added" : "Add"}
              </button>
            </div>
          );
        })}
        {!teams.length && <p className="py-6 text-center text-sm text-ink-faint">No matching teams yet. Create the team once, add its real logo, and reuse it everywhere.</p>}
      </div>

      {message && <p className="mt-3 text-xs text-ink-faint" role="status">{message}</p>}
    </section>
  );
}
