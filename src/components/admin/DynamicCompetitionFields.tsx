"use client";

import { useMemo } from "react";
import { COMPETITION_PRESETS, getCompetitionPreset } from "@/lib/competition-engine";

type Props = {
  preset: string;
  sport: string;
  competitionType: "tournament" | "league" | "event";
  participantMode: "individual" | "team" | "pair" | "mixed";
  scoringMode: string;
  format: string;
  bestOf: number;
  onPreset: (v: string) => void;
  onSport: (v: string) => void;
  onCompetitionType: (v: Props["competitionType"]) => void;
  onParticipantMode: (v: Props["participantMode"]) => void;
  onScoringMode: (v: string) => void;
  onFormat: (v: string) => void;
  onBestOf: (v: number) => void;
};

const input = "w-full rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live";

export function DynamicCompetitionFields(props: Props) {
  const selected = useMemo(() => getCompetitionPreset(props.preset), [props.preset]);
  const formats = selected.formats;

  return (
    <div className="md:col-span-2 rounded-card border border-arena-700 bg-arena-950/60 p-4">
      <div className="mb-4">
        <p className="font-mono text-xs uppercase tracking-widest text-signal-live">Dynamic competition engine</p>
        <p className="mt-1 text-xs text-ink-faint">Choose the competition family. The platform stores the sport, participant model and scoring rules instead of assuming every event is a fighting game.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Competition preset</span>
          <select className={input} value={props.preset} onChange={(e) => {
            const p = getCompetitionPreset(e.target.value);
            props.onPreset(p.id);
            props.onScoringMode(p.scoringMode);
            props.onFormat(p.defaultFormat);
            props.onBestOf(p.defaultBestOf);
            props.onParticipantMode(p.participantLabel.toLowerCase().includes("team") ? "team" : p.participantLabel.includes("pairs") ? "pair" : "individual");
          }}>
            {COMPETITION_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Sport / game name</span>
          <input className={input} value={props.sport} onChange={(e) => props.onSport(e.target.value)} placeholder="e.g. Cricket, Valorant, Tennis" />
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Competition type</span>
          <select className={input} value={props.competitionType} onChange={(e) => props.onCompetitionType(e.target.value as Props["competitionType"])}>
            <option value="tournament">Tournament</option><option value="league">League</option><option value="event">Event</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Participant model</span>
          <select className={input} value={props.participantMode} onChange={(e) => props.onParticipantMode(e.target.value as Props["participantMode"])}>
            <option value="individual">Individual</option><option value="pair">Pairs / doubles</option><option value="team">Teams</option><option value="mixed">Mixed</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Scoring engine</span>
          <input className={input} value={props.scoringMode} onChange={(e) => props.onScoringMode(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Format</span>
          <select className={input} value={props.format} onChange={(e) => props.onFormat(e.target.value)}>
            {formats.map((f) => <option key={f} value={f}>{f.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink-faint">Best of</span>
          <select className={input} value={props.bestOf} onChange={(e) => props.onBestOf(Number(e.target.value))}>
            {[1, 3, 5, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
