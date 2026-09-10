"use client";

import type { CompetitionType } from "@/lib/competition";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCompetitionRules,
  getCompetitionDefinition,
  listCompetitionDefinitions,
} from "@/lib/competition";
import {
  createBattleRoyalePreset,
  type CompetitionStageConfig,
  type DynamicCompetitionConfig,
  validateDynamicCompetition,
} from "@/lib/dynamic-competition";

const COUNTS = [2, 4, 8, 16, 32, 64];
const BEST_OF_VALUES = [1, 3, 5, 7, 9];
const PARTICIPANT_MODES = [
  ["individual", "Individual"],
  ["team", "Teams"],
  ["pair", "Pairs / Doubles"],
  ["mixed", "Mixed / Custom"],
] as const;

const STANDARD_FORMATS = [
  ["SINGLE_ELIMINATION", "Single elimination"],
  ["DOUBLE_ELIMINATION", "Double elimination"],
  ["ROUND_ROBIN", "Round robin"],
  ["SWISS", "Swiss"],
] as const;

function makeStandardStage(format: CompetitionStageConfig["format"] = "SINGLE_ELIMINATION"): CompetitionStageConfig {
  return {
    id: `stage-${Date.now()}`,
    name: "Playoffs",
    order: 0,
    format,
    session: { mode: "MATCH" },
    scoring: { placementPoints: [], eliminationPoints: 0, bonuses: {}, penalties: {} },
    advancement: { method: "ALL", tieBreaker: ["score"] },
    victory: { method: "MOST_WINS", requiresWinAfterThreshold: false },
    rules: {},
  };
}

function normalizeStages(stages: CompetitionStageConfig[]) {
  return stages.map((stage, index) => ({ ...stage, order: index }));
}

export function CreateTournamentForm() {
  const router = useRouter();
  const definitions = useMemo(() => listCompetitionDefinitions(), []);
  const initialPreset = getCompetitionDefinition("esports");

  const [name, setName] = useState("");
  const [sport, setSport] = useState("esports");
  const [game, setGame] = useState("Street Fighter 6");
  const [competitionType, setCompetitionType] = useState(initialPreset.competitionType);
  const [participantMode, setParticipantMode] = useState(initialPreset.participantMode);
  const [scoringMode, setScoringMode] = useState(initialPreset.scoringAdapter);
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [bestOf, setBestOf] = useState(initialPreset.bestOf);
  const [multiStage, setMultiStage] = useState(false);
  const [stages, setStages] = useState<CompetitionStageConfig[]>([makeStandardStage()]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [participantText, setParticipantText] = useState("");
  const [stationCount, setStationCount] = useState(4);
  const [rulesText, setRulesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const participants = useMemo(
    () => [...new Map(participantText.split(/\n+/).map((value) => value.trim()).filter(Boolean).map((value) => [value.toLowerCase(), value])).values()],
    [participantText],
  );

  const isBattleRoyale = sport === "bgmi" || scoringMode === "battle_royale";
  const isKnockoutFormat = format === "SINGLE_ELIMINATION" || format === "DOUBLE_ELIMINATION";
  const validCount = isBattleRoyale || !isKnockoutFormat
    ? participants.length >= 2 && participants.length <= 64
    : COUNTS.includes(participants.length);

  const preset = useMemo(() => getCompetitionDefinition(sport), [sport]);
  const previewRules = useMemo(() => {
    let overrides: Record<string, unknown> = {};
    if (rulesText.trim()) {
      try { overrides = JSON.parse(rulesText) as Record<string, unknown>; } catch { overrides = {}; }
    }
    return buildCompetitionRules(sport, { competitionType, participantMode, scoringAdapter: scoringMode, bestOf, ...overrides });
  }, [sport, competitionType, participantMode, scoringMode, bestOf, rulesText]);

  function onSportChange(value: string) {
    const nextPreset = getCompetitionDefinition(value);
    setSport(value);
    setCompetitionType(nextPreset.competitionType);
    setParticipantMode(nextPreset.participantMode);
    setScoringMode(nextPreset.scoringAdapter);
    setBestOf(nextPreset.bestOf);
    setRulesText("");

    if (value === "bgmi") {
      setGame("BGMI");
      setMultiStage(true);
      const presetConfig = createBattleRoyalePreset();
      setStages(presetConfig.stages);
      setFormat("SINGLE_ELIMINATION");
      return;
    }

    setMultiStage(false);
    setStages([makeStandardStage("SINGLE_ELIMINATION")]);
    const defaults: Record<string, string> = {
      esports: "Street Fighter 6",
      football: "Football",
      basketball: "Basketball",
      cricket: "Cricket",
      tennis: "Tennis",
      badminton: "Badminton",
      volleyball: "Volleyball",
      "table-tennis": "Table Tennis",
      racing: "Time Trial",
      skills: "Skills Challenge",
    };
    setGame(defaults[value] ?? "Custom Competition");
  }

  function enableBattleRoyale() {
    setScoringMode("battle_royale");
    setMultiStage(true);
    setFormat("SINGLE_ELIMINATION");
    setStages(createBattleRoyalePreset().stages);
  }

  function updateStage(index: number, patch: Partial<CompetitionStageConfig>) {
    setStages((current) => normalizeStages(current.map((stage, i) => i === index ? { ...stage, ...patch } : stage)));
  }

  function updateStageSession(index: number, patch: Partial<CompetitionStageConfig["session"]>) {
    setStages((current) => normalizeStages(current.map((stage, i) => i === index ? { ...stage, session: { ...stage.session, ...patch } } : stage)));
  }

  function addStage() {
    setStages((current) => normalizeStages([...current, makeStandardStage(isBattleRoyale ? "BATTLE_ROYALE_SESSION" : "SINGLE_ELIMINATION")]));
    setMultiStage(true);
  }

  function removeStage(index: number) {
    setStages((current) => normalizeStages(current.filter((_, i) => i !== index)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!validCount) {
      setError(isKnockoutFormat && !isBattleRoyale ? "Knockout formats require 2, 4, 8, 16, 32 or 64 competitors." : "Enter between 2 and 64 competitors.");
      return;
    }

    let competitionRules: Record<string, unknown> = {};
    if (rulesText.trim()) {
      try {
        competitionRules = JSON.parse(rulesText) as Record<string, unknown>;
        if (typeof competitionRules !== "object" || Array.isArray(competitionRules) || competitionRules === null) throw new Error();
      } catch {
        setError('Custom rules must be valid JSON, for example {"winPoints":3}.');
        return;
      }
    }

    const dynamicConfig: DynamicCompetitionConfig = isBattleRoyale
      ? {
          version: 1,
          family: "BATTLE_ROYALE",
          stages: normalizeStages(stages.map((stage) => ({
            ...stage,
            format: "BATTLE_ROYALE_SESSION",
          }))),
        }
      : {
          version: 1,
          family: "STANDARD",
          stages: normalizeStages((multiStage ? stages : [
            {
              ...stages[0],
              name: format === "SINGLE_ELIMINATION" ? "Playoffs" : format.replaceAll("_", " "),
              format: format as CompetitionStageConfig["format"],
            },
          ])),
        };

    try {
      validateDynamicCompetition(dynamicConfig);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Invalid competition structure.");
      return;
    }

    const normalizedRules = buildCompetitionRules(sport, {
      competitionType,
      participantMode,
      scoringAdapter: scoringMode,
      bestOf: isBattleRoyale ? 1 : bestOf,
      dynamicCompetition: dynamicConfig,
      ...competitionRules,
    });

    setSubmitting(true);
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          game: game || name,
          sport,
          competitionType,
          participantMode,
          scoringMode,
          competitionRules: normalizedRules,
          startDate: new Date(startDate).toISOString(),
          stationCount,
          players: participants,
          format: isBattleRoyale ? "SINGLE_ELIMINATION" : format,
          bestOf: isBattleRoyale ? 1 : bestOf,
          multiStage: multiStage || isBattleRoyale,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create tournament.");
      router.push(`/admin/tournaments/${data.tournament.id}/control-room`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tournament.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-5xl rounded-card border border-arena-700 bg-arena-900 p-5 sm:p-6">
      <div className="mb-6 rounded-card border border-signal-live/20 bg-signal-live/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">V34 Dynamic Competition Engine</p>
        <p className="mt-1 text-sm text-ink-muted">Build a competition from stages. Battle Royale uses sessions, scoring and advancement rules instead of round-robin, Swiss or best-of series.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2"><span className="field-label">Competition name</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Open 2026" className="field-input" /></label>
        <label><span className="field-label">Sport / category</span><select value={sport} onChange={(e) => onSportChange(e.target.value)} className="field-input">{definitions.map((definition) => <option key={definition.sport} value={definition.sport}>{definition.label}</option>)}</select></label>
        <label><span className="field-label">{sport === "esports" ? "Game / title" : "Discipline / title"}</span><input required value={game} onChange={(e) => setGame(e.target.value)} placeholder="Valorant / Fortnite / BGMI" className="field-input" /></label>
        <label><span className="field-label">Competition type</span><select value={competitionType} onChange={(e) => setCompetitionType(e.target.value as CompetitionType)} className="field-input"><option value="tournament">Tournament</option><option value="league">League</option><option value="season">Season</option><option value="showmatch">Showmatch</option><option value="scrim">Scrim</option><option value="challenge">Challenge</option><option value="custom">Custom</option></select></label>
        <label><span className="field-label">Participant model</span><select value={participantMode} onChange={(e) => setParticipantMode(e.target.value as typeof participantMode)} className="field-input">{PARTICIPANT_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      <section className="mt-6 rounded-card border border-arena-700 bg-arena-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="section-label">Competition structure</p><h2 className="mt-1 font-display text-3xl uppercase">{isBattleRoyale ? "Battle Royale" : "Match / stage format"}</h2></div>
          {!isBattleRoyale && <button type="button" onClick={enableBattleRoyale} className="action-secondary">Use Battle Royale rules</button>}
        </div>

        {isBattleRoyale ? (
          <div className="mt-4 rounded-card border border-signal-live/25 bg-signal-live/5 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="metric-label">Format</p><p className="mt-1 font-display text-xl uppercase">Session based</p></div>
              <div><p className="metric-label">Scoring</p><p className="mt-1 font-display text-xl uppercase">Placement + eliminations</p></div>
              <div><p className="metric-label">Series</p><p className="mt-1 font-display text-xl uppercase">Not applicable</p></div>
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-faint">Round Robin, Swiss and Best-of controls are intentionally unavailable for Battle Royale competitions.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label><span className="field-label">Format</span><select value={format} onChange={(e) => { setFormat(e.target.value); setStages([makeStandardStage(e.target.value as CompetitionStageConfig["format"])]); }} className="field-input">{STANDARD_FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="field-label">Best of / series</span><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} className="field-input">{BEST_OF_VALUES.map((value) => <option key={value} value={value}>Best of {value}</option>)}</select></label>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {stages.map((stage, index) => (
            <article key={stage.id} className="rounded-card border border-arena-700 bg-arena-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="ds-index">0{index + 1} / stage</p><input value={stage.name} onChange={(e) => updateStage(index, { name: e.target.value })} className="mt-1 w-full bg-transparent font-display text-2xl uppercase tracking-wide text-ink outline-none" /></div>
                {stages.length > 1 && <button type="button" onClick={() => removeStage(index)} className="action-ghost text-signal-accent">Remove</button>}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label><span className="field-label">Stage format</span><select disabled={isBattleRoyale} value={stage.format} onChange={(e) => updateStage(index, { format: e.target.value as CompetitionStageConfig["format"] })} className="field-input disabled:opacity-60"><option value="BATTLE_ROYALE_SESSION">Battle Royale session</option><option value="SINGLE_ELIMINATION">Single elimination</option><option value="DOUBLE_ELIMINATION">Double elimination</option><option value="ROUND_ROBIN">Round robin</option><option value="SWISS">Swiss</option><option value="LEAGUE">League</option><option value="CUSTOM">Custom</option></select></label>
                <label><span className="field-label">Session</span><select value={stage.session.mode} onChange={(e) => updateStageSession(index, { mode: e.target.value as CompetitionStageConfig["session"]["mode"] })} className="field-input"><option value="MATCH">Match / series</option><option value="FIXED_GAMES">Fixed games</option><option value="FIXED_TIME">Fixed time</option><option value="UNTIL_THRESHOLD">Until threshold</option></select></label>
                {stage.session.mode === "FIXED_GAMES" && <label><span className="field-label">Games</span><input type="number" min={1} value={stage.session.games ?? 1} onChange={(e) => updateStageSession(index, { games: Number(e.target.value) })} className="field-input" /></label>}
                {stage.session.mode === "FIXED_TIME" && <label><span className="field-label">Duration (minutes)</span><input type="number" min={1} value={stage.session.durationMinutes ?? 30} onChange={(e) => updateStageSession(index, { durationMinutes: Number(e.target.value) })} className="field-input" /></label>}
                <label><span className="field-label">Advancement</span><select value={stage.advancement.method} onChange={(e) => updateStage(index, { advancement: { ...stage.advancement, method: e.target.value as CompetitionStageConfig["advancement"]["method"] } })} className="field-input"><option value="TOP_N">Top N</option><option value="TOP_PERCENT">Top %</option><option value="POINTS_THRESHOLD">Points threshold</option><option value="WINS">Wins</option><option value="MANUAL">Manual</option><option value="ALL">All</option></select></label>
                {(stage.advancement.method === "TOP_N" || stage.advancement.method === "TOP_PERCENT" || stage.advancement.method === "POINTS_THRESHOLD") && <label><span className="field-label">Value</span><input type="number" min={0} value={stage.advancement.value ?? 1} onChange={(e) => updateStage(index, { advancement: { ...stage.advancement, value: Number(e.target.value) } })} className="field-input" /></label>}
                {isBattleRoyale && <label><span className="field-label">Elimination points</span><input type="number" value={stage.scoring.eliminationPoints} onChange={(e) => updateStage(index, { scoring: { ...stage.scoring, eliminationPoints: Number(e.target.value) } })} className="field-input" /></label>}
              </div>
            </article>
          ))}
        </div>
        <button type="button" onClick={addStage} className="action-secondary mt-4">+ Add stage</button>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label><span className="field-label">Scoring adapter</span><select value={scoringMode} onChange={(e) => setScoringMode(e.target.value)} className="field-input"><option value="points">Points</option><option value="goals">Goals</option><option value="runs">Runs</option><option value="sets">Sets</option><option value="time">Time</option><option value="attempts">Attempts</option><option value="battle_royale">Battle Royale</option><option value="custom">Custom metric</option></select></label>
        <label><span className="field-label">Start date & time</span><input required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field-input" /></label>
        <label><span className="field-label">Broadcast stations / courts</span><input required type="number" min={1} max={64} value={stationCount} onChange={(e) => setStationCount(Number(e.target.value))} className="field-input" /></label>
        <label><span className="field-label">Multi-stage</span><button type="button" onClick={() => setMultiStage(!multiStage)} className={`field-input text-left ${multiStage ? "border-signal-live text-signal-live" : "text-ink-muted"}`}>{multiStage ? "Enabled — stages will be preserved" : "Disabled — use the primary format only"}</button></label>
        <label className="md:col-span-2"><span className="field-label">{participantMode === "team" ? "Teams" : participantMode === "pair" ? "Pairs / entries" : "Players / entries"}</span><textarea required rows={7} value={participantText} onChange={(e) => setParticipantText(e.target.value)} placeholder={"Entry One\nEntry Two\nEntry Three\nEntry Four"} className="field-input min-h-40" /><div className="mt-2 flex justify-between text-xs"><span className={validCount ? "text-signal-live" : "text-ink-faint"}>{participants.length} unique entries</span><span className="text-ink-faint">One entry per line</span></div></label>
        <label className="md:col-span-2"><span className="field-label">Custom rules JSON <span className="normal-case text-ink-faint">(optional)</span></span><textarea rows={4} value={rulesText} onChange={(e) => setRulesText(e.target.value)} placeholder='{"winPoints":3,"drawPoints":1}' className="field-input font-mono text-xs" /></label>
      </div>

      <section className="mt-6 rounded-card border border-arena-700 bg-arena-950 p-4">
        <div className="flex items-start justify-between gap-4"><div><p className="section-label">Rules preview</p><h2 className="mt-1 font-display text-2xl uppercase">{preset.label}</h2></div><span className="status-neutral">{isBattleRoyale ? "BATTLE ROYALE" : "STANDARD"}</span></div>
        <pre className="mt-4 max-h-56 overflow-auto rounded-card border border-arena-800 bg-black/20 p-3 font-mono text-[10px] leading-5 text-ink-faint">{JSON.stringify(previewRules, null, 2)}</pre>
      </section>

      {error && <div role="alert" className="mt-5 rounded-card border border-signal-accent/30 bg-signal-accent/10 p-4 text-sm text-signal-accent">{error}</div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-arena-700 pt-5">
        <p className="text-xs text-ink-faint">Battle Royale stages are session/scoring based; they do not use round-robin, Swiss or Best-of controls.</p>
        <button type="submit" disabled={submitting || !validCount} className="action-primary disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating…" : "Create tournament"}</button>
      </div>
    </form>
  );
}
