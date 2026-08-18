"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PLAYER_COUNTS = [2, 4, 8, 16, 32, 64];

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [game, setGame] = useState("Street Fighter 6");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [playerText, setPlayerText] = useState("");
  const [stationCount, setStationCount] = useState(4);
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [bestOf, setBestOf] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const players = useMemo(
    () => [...new Set(playerText.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean))],
    [playerText]
  );
  const validPlayerCount = PLAYER_COUNTS.includes(players.length);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!validPlayerCount) {
      setError("Enter exactly 2, 4, 8, 16, 32 or 64 unique players.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          game,
          startDate: new Date(startDate).toISOString(),
          stationCount,
          players,
          format,
          bestOf,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create tournament.");
      }
      router.push(`/admin/tournaments/${data.tournament.id}/control-room`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tournament.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl rounded-card border border-arena-700 bg-arena-900 p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Tournament name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="FGC Summer Cup" className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live" />
        </label>

        <label>
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Game</span>
          <input required value={game} onChange={(e) => setGame(e.target.value)} className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live" />
        </label>

        <label>
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Start date & time</span>
          <input required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live" />
        </label>


        <label>
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live">
            <option value="SINGLE_ELIMINATION">Single elimination</option>
            <option value="DOUBLE_ELIMINATION">Double elimination</option>
            <option value="ROUND_ROBIN">Round robin</option>
            <option value="SWISS">Swiss</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Series</span>
          <select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live">
            {[1,3,5,7,9].map((v) => <option key={v} value={v}>Best of {v}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Stations</span>
          <input required type="number" min={1} max={64} value={stationCount} onChange={(e) => setStationCount(Number(e.target.value))} className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live" />
          <span className="mt-1 block text-xs text-ink-faint">Initial matches are assigned across these stations.</span>
        </label>

        <div className="md:col-span-2">
          <label>
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-ink-faint">Players / teams</span>
            <textarea required rows={10} value={playerText} onChange={(e) => setPlayerText(e.target.value)} placeholder={"PlayerOne\nPlayerTwo\nPlayerThree\nPlayerFour"} className="w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live" />
          </label>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={validPlayerCount ? "text-signal-live" : "text-ink-faint"}>{players.length} unique players</span>
            <span className="text-ink-faint">Use one per line or comma-separated.</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-card border border-signal-live/20 bg-signal-live/5 p-4 text-sm text-ink-muted">
        This creates the tournament, entrants, stations and the selected competition format. Single/double elimination advance from completed matches; round-robin schedules all pairings.
      </div>

      {error && <p className="mt-4 rounded-card border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" disabled={submitting} className="rounded-card bg-signal-live px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-arena-950 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Creating…" : "Create tournament"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-card border border-arena-600 px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
