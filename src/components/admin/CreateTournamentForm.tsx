"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COUNTS = [2, 4, 8, 16, 32, 64];
const SPORTS = [
  ["esports", "Esports / Game"],
  ["football", "Football / Soccer"],
  ["basketball", "Basketball"],
  ["cricket", "Cricket"],
  ["tennis", "Tennis"],
  ["badminton", "Badminton"],
  ["volleyball", "Volleyball"],
  ["table-tennis", "Table Tennis"],
  ["custom", "Custom Competition"],
];

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("esports");
  const [game, setGame] = useState("Street Fighter 6");
  const [participantMode, setParticipantMode] = useState("individual");
  const [scoringMode, setScoringMode] = useState("points");
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [bestOf, setBestOf] = useState(3);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [participantText, setParticipantText] = useState("");
  const [stationCount, setStationCount] = useState(4);
  const [rulesText, setRulesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const participants = useMemo(() => [...new Map(participantText.split(/\n+/).map(v => v.trim()).filter(Boolean).map(v => [v.toLowerCase(), v])).values()], [participantText]);
  const validCount = COUNTS.includes(participants.length);

  function onSportChange(value: string) {
    setSport(value);
    if (value === "football") { setParticipantMode("team"); setScoringMode("goals"); setBestOf(1); }
    else if (value === "basketball") { setParticipantMode("team"); setScoringMode("points"); setBestOf(1); }
    else if (value === "cricket") { setParticipantMode("team"); setScoringMode("runs"); setBestOf(1); }
    else if (value === "volleyball") { setParticipantMode("team"); setScoringMode("sets"); setBestOf(5); }
    else if (value === "tennis" || value === "badminton" || value === "table-tennis") { setParticipantMode("individual"); setScoringMode("sets"); setBestOf(value === "table-tennis" ? 5 : 3); }
    else { setParticipantMode("individual"); setScoringMode("points"); setBestOf(value === "esports" ? 3 : 1); }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (!validCount) { setError("Use exactly 2, 4, 8, 16, 32 or 64 competitors for automatic draw generation."); return; }
    let competitionRules: Record<string, unknown> = {};
    if (rulesText.trim()) {
      try { competitionRules = JSON.parse(rulesText); }
      catch { setError('Custom rules must be valid JSON, for example {"winPoints":3,"periodMinutes":45}.'); return; }
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/tournaments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name, game: game || name, sport, competitionType: "tournament", participantMode, scoringMode, competitionRules,
        startDate: new Date(startDate).toISOString(), stationCount, players: participants, format, bestOf,
      })});
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create tournament.");
      router.push(`/admin/tournaments/${data.tournament.id}/control-room`);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create tournament."); setSubmitting(false); }
  }

  return <form onSubmit={submit} className="max-w-4xl rounded-card border border-arena-700 bg-arena-900 p-5 sm:p-6">
    <div className="mb-6 rounded-card border border-signal-live/20 bg-signal-live/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">Generic competition engine</p>
      <p className="mt-1 text-sm text-ink-muted">The same event engine supports esports, traditional sports, team events, individual events and custom competitions.</p>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <label className="md:col-span-2"><span className="field-label">Competition name</span><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Summer Open 2026" className="field-input" /></label>
      <label><span className="field-label">Sport / category</span><select value={sport} onChange={e=>onSportChange(e.target.value)} className="field-input">{SPORTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label><span className="field-label">{sport === "esports" ? "Game / title" : "Discipline / title"}</span><input required value={game} onChange={e=>setGame(e.target.value)} placeholder={sport === "esports" ? "Street Fighter 6 / Valorant / BGMI" : "Open division"} className="field-input" /></label>
      <label><span className="field-label">Participant model</span><select value={participantMode} onChange={e=>setParticipantMode(e.target.value)} className="field-input"><option value="individual">Individual</option><option value="team">Teams</option><option value="pair">Pairs / Doubles</option><option value="mixed">Mixed / Custom</option></select></label>
      <label><span className="field-label">Scoring adapter</span><select value={scoringMode} onChange={e=>setScoringMode(e.target.value)} className="field-input"><option value="points">Points</option><option value="goals">Goals</option><option value="runs">Runs</option><option value="sets">Sets</option><option value="time">Time</option><option value="attempts">Attempts</option><option value="custom">Custom metric</option></select></label>
      <label><span className="field-label">Format</span><select value={format} onChange={e=>setFormat(e.target.value)} className="field-input"><option value="SINGLE_ELIMINATION">Single elimination</option><option value="DOUBLE_ELIMINATION">Double elimination</option><option value="ROUND_ROBIN">Round robin</option><option value="SWISS">Swiss</option></select></label>
      <label><span className="field-label">Best of / series</span><select value={bestOf} onChange={e=>setBestOf(Number(e.target.value))} className="field-input">{[1,3,5,7,9].map(v=><option key={v} value={v}>Best of {v}</option>)}</select></label>
      <label><span className="field-label">Start date & time</span><input required type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} className="field-input" /></label>
      <label><span className="field-label">Broadcast stations / courts</span><input required type="number" min={1} max={64} value={stationCount} onChange={e=>setStationCount(Number(e.target.value))} className="field-input" /></label>
      <label className="md:col-span-2"><span className="field-label">{participantMode === "team" ? "Teams" : participantMode === "pair" ? "Pairs / entries" : "Players / entries"}</span><textarea required rows={8} value={participantText} onChange={e=>setParticipantText(e.target.value)} placeholder={"Entry One\nEntry Two\nEntry Three\nEntry Four"} className="field-input min-h-48" /><div className="mt-2 flex justify-between text-xs"><span className={validCount ? "text-signal-live" : "text-ink-faint"}>{participants.length} unique entries</span><span className="text-ink-faint">One entry per line</span></div></label>
      <label className="md:col-span-2"><span className="field-label">Custom rules JSON <span className="normal-case text-ink-faint">(optional)</span></span><textarea rows={4} value={rulesText} onChange={e=>setRulesText(e.target.value)} placeholder='{"winPoints":3,"drawPoints":1,"periodMinutes":45}' className="field-input font-mono text-xs" /></label>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center rounded-card bg-signal-live px-5 font-mono text-xs font-bold uppercase tracking-wide text-arena-950 disabled:opacity-50">{submitting ? "Creating…" : "Create competition"}</button>
      <button type="button" onClick={()=>router.back()} className="inline-flex min-h-11 items-center justify-center rounded-card border border-arena-600 px-5 font-mono text-xs font-semibold uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-ink">Cancel</button>
    </div>
    {error && <p className="mt-4 rounded-card border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}
  </form>;
}
