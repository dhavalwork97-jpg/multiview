"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DemoShell } from "../_components/demo-shell";

const SPORTS = [
  ["esports", "Esports"],
  ["football", "Football"],
  ["basketball", "Basketball"],
  ["cricket", "Cricket"],
  ["tennis", "Tennis"],
] as const;

const FORMATS = [
  ["SINGLE_ELIMINATION", "Single elimination"],
  ["DOUBLE_ELIMINATION", "Double elimination"],
  ["ROUND_ROBIN", "Round robin"],
  ["SWISS", "Swiss"],
] as const;

const PARTICIPANTS = ["individual", "team", "pair", "mixed"] as const;

export default function DemoCreateTournament() {
  const [name, setName] = useState("FGC Summer Open 2026");
  const [sport, setSport] = useState("esports");
  const [game, setGame] = useState("Street Fighter 6");
  const [competitionType, setCompetitionType] = useState("tournament");
  const [participantMode, setParticipantMode] = useState<(typeof PARTICIPANTS)[number]>("individual");
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [bestOf, setBestOf] = useState(3);
  const [multiStage, setMultiStage] = useState(false);
  const [stations, setStations] = useState(4);
  const [participants, setParticipants] = useState("MortalKombatKid\nKnee\nArslan Ash\nMenaRD\nPunk\nTokido\nDaigo\nNuckleDu");
  const [created, setCreated] = useState(false);

  const participantList = useMemo(() => participants.split(/\n+/).map((value) => value.trim()).filter(Boolean), [participants]);

  return (
    <DemoShell title="Create tournament" eyebrow="Organizer · Tournament setup · Read only demo">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-signal-live/20 bg-signal-live/5 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">V34 Dynamic Competition Engine</p>
          <p className="mt-1 text-sm text-ink-muted">A faithful public walkthrough of the real tournament creation flow. Nothing is written to production.</p>
        </div>
        <Link href="/demo/organizer" className="action-secondary">Organizer workspace →</Link>
      </div>

      {created ? (
        <section className="rounded-card border border-signal-live/30 bg-arena-900 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-signal-live">Tournament ready</p>
          <h2 className="mt-2 font-display text-4xl uppercase">{name}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Title", game], ["Format", format.replaceAll("_", " ")], ["Players", String(participantList.length)], ["Stations", String(stations)]].map(([label, value]) => <div key={label} className="rounded-card border border-arena-700 bg-arena-950 p-4"><p className="metric-label">{label}</p><p className="mt-2 font-display text-xl uppercase">{value}</p></div>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo/tournament" className="action-primary">Open tournament operations →</Link>
            <Link href="/demo/organizer" className="action-secondary">Open organizer command center →</Link>
            <button type="button" onClick={() => setCreated(false)} className="action-ghost">Edit setup</button>
          </div>
        </section>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); setCreated(true); }} className="max-w-5xl rounded-card border border-arena-700 bg-arena-900 p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2"><span className="field-label">Competition name</span><input required value={name} onChange={(e) => setName(e.target.value)} className="field-input" /></label>
            <label><span className="field-label">Sport / category</span><select value={sport} onChange={(e) => setSport(e.target.value)} className="field-input">{SPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="field-label">{sport === "esports" ? "Game / title" : "Discipline / title"}</span><input required value={game} onChange={(e) => setGame(e.target.value)} className="field-input" /></label>
            <label><span className="field-label">Competition type</span><select value={competitionType} onChange={(e) => setCompetitionType(e.target.value)} className="field-input"><option value="tournament">Tournament</option><option value="league">League</option><option value="season">Season</option><option value="showmatch">Showmatch</option><option value="challenge">Challenge</option><option value="custom">Custom</option></select></label>
            <label><span className="field-label">Participant model</span><select value={participantMode} onChange={(e) => setParticipantMode(e.target.value as (typeof PARTICIPANTS)[number])} className="field-input">{PARTICIPANTS.map((value) => <option key={value} value={value}>{value === "pair" ? "Pairs / Doubles" : value === "mixed" ? "Mixed / Custom" : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
          </div>

          <section className="mt-6 rounded-card border border-arena-700 bg-arena-950 p-4">
            <p className="section-label">Competition structure</p>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <label><span className="field-label">Format</span><select value={format} onChange={(e) => setFormat(e.target.value)} className="field-input">{FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span className="field-label">Best of / series</span><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} className="field-input">{[1, 3, 5, 7, 9].map((value) => <option key={value} value={value}>Best of {value}</option>)}</select></label>
            </div>
            <label className="mt-5 flex items-center gap-3 rounded-card border border-arena-700 bg-arena-900 p-4"><input type="checkbox" checked={multiStage} onChange={(e) => setMultiStage(e.target.checked)} /><span><span className="block text-sm font-semibold">Multi-stage competition</span><span className="text-xs text-ink-faint">Build qualifiers, groups and playoffs as separate stages.</span></span></label>
          </section>

          <section className="mt-6 grid gap-5 md:grid-cols-2">
            <label><span className="field-label">Stations</span><input type="number" min={1} max={64} value={stations} onChange={(e) => setStations(Number(e.target.value))} className="field-input" /></label>
            <label><span className="field-label">Start date & time</span><input type="datetime-local" defaultValue="2026-09-20T12:00" className="field-input" /></label>
          </section>

          <section className="mt-6">
            <div className="flex items-end justify-between gap-3"><div><p className="section-label">Participants</p><p className="mt-1 text-xs text-ink-faint">One competitor per line. The real flow normalizes duplicate names.</p></div><span className="font-mono text-xs text-signal-live">{participantList.length} loaded</span></div>
            <textarea value={participants} onChange={(e) => setParticipants(e.target.value)} rows={8} className="field-input mt-3 min-h-40 resize-y font-mono text-xs" />
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-arena-700 pt-5">
            <div><p className="text-sm font-semibold">Ready to build the event?</p><p className="text-xs text-ink-faint">This demo simulates creation and never calls the tournament API.</p></div>
            <button type="submit" className="action-primary">Create tournament →</button>
          </div>
        </form>
      )}
    </DemoShell>
  );
}
