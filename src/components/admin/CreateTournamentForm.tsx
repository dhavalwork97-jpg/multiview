"use client";
import type { CompetitionType } from "@/lib/competition";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCompetitionRules,
  getCompetitionDefinition,
  listCompetitionDefinitions,
} from "@/lib/competition";

const COUNTS = [2, 4, 8, 16, 32, 64];

const FORMATS = [
  ["SINGLE_ELIMINATION", "Single elimination"],
  ["DOUBLE_ELIMINATION", "Double elimination"],
  ["ROUND_ROBIN", "Round robin"],
  ["SWISS", "Swiss"],
] as const;

const PARTICIPANT_MODES = [
  ["individual", "Individual"],
  ["team", "Teams"],
  ["pair", "Pairs / Doubles"],
  ["mixed", "Mixed / Custom"],
] as const;

const BEST_OF_VALUES = [1, 3, 5, 7, 9];

export function CreateTournamentForm() {
  const router = useRouter();

  const definitions = useMemo(
    () => listCompetitionDefinitions(),
    [],
  );

  const [name, setName] = useState("");
  const [sport, setSport] = useState("esports");
  const [game, setGame] = useState("Street Fighter 6");

  const initialPreset = getCompetitionDefinition("esports");

  const [competitionType, setCompetitionType] = useState(
    initialPreset.competitionType,
  );
  const [participantMode, setParticipantMode] = useState(
    initialPreset.participantMode,
  );
  const [scoringMode, setScoringMode] = useState(
    initialPreset.scoringAdapter,
  );
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [bestOf, setBestOf] = useState(initialPreset.bestOf);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return new Date(
      d.getTime() - d.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
  });

  const [participantText, setParticipantText] = useState("");
  const [stationCount, setStationCount] = useState(4);
  const [rulesText, setRulesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const participants = useMemo(
    () =>
      [
        ...new Map(
          participantText
            .split(/\n+/)
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => [value.toLowerCase(), value]),
        ).values(),
      ],
    [participantText],
  );

  const validCount = COUNTS.includes(participants.length);

  const preset = useMemo(
    () => getCompetitionDefinition(sport),
    [sport],
  );

  const previewRules = useMemo(() => {
    let overrides: Record<string, unknown> = {};

    if (rulesText.trim()) {
      try {
        overrides = JSON.parse(rulesText) as Record<string, unknown>;
      } catch {
        overrides = {};
      }
    }

    return buildCompetitionRules(sport, {
      competitionType,
      participantMode,
      scoringAdapter: scoringMode,
      bestOf,
      ...overrides,
    });
  }, [
    sport,
    competitionType,
    participantMode,
    scoringMode,
    bestOf,
    rulesText,
  ]);

  function onSportChange(value: string) {
    const nextPreset = getCompetitionDefinition(value);

    setSport(value);
    setCompetitionType(nextPreset.competitionType);
    setParticipantMode(nextPreset.participantMode);
    setScoringMode(nextPreset.scoringAdapter);
    setBestOf(nextPreset.bestOf);

    if (value === "esports") {
      setGame("Street Fighter 6");
    } else if (value === "football") {
      setGame("Football");
    } else if (value === "basketball") {
      setGame("Basketball");
    } else if (value === "cricket") {
      setGame("Cricket");
    } else if (value === "tennis") {
      setGame("Tennis");
    } else if (value === "badminton") {
      setGame("Badminton");
    } else if (value === "volleyball") {
      setGame("Volleyball");
    } else if (value === "table-tennis") {
      setGame("Table Tennis");
    } else if (value === "racing") {
      setGame("Time Trial");
    } else if (value === "skills") {
      setGame("Skills Challenge");
    } else {
      setGame("Custom Competition");
    }

    setRulesText("");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!validCount) {
      setError(
        "Use exactly 2, 4, 8, 16, 32 or 64 competitors for automatic draw generation.",
      );
      return;
    }

    let competitionRules: Record<string, unknown> = {};

    if (rulesText.trim()) {
      try {
        competitionRules = JSON.parse(rulesText);

        if (
          typeof competitionRules !== "object" ||
          Array.isArray(competitionRules) ||
          competitionRules === null
        ) {
          throw new Error("Rules must be a JSON object.");
        }
      } catch {
        setError(
          'Custom rules must be valid JSON, for example {"winPoints":3,"periodMinutes":45}.',
        );
        return;
      }
    }

    const normalizedRules = buildCompetitionRules(sport, {
      competitionType,
      participantMode,
      scoringAdapter: scoringMode,
      bestOf,
      ...competitionRules,
    });

    setSubmitting(true);

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          format,
          bestOf,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not create tournament.",
        );
      }

      router.push(
        `/admin/tournaments/${data.tournament.id}/control-room`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create tournament.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-4xl rounded-card border border-arena-700 bg-arena-900 p-5 sm:p-6"
    >
      <div className="mb-6 rounded-card border border-signal-live/20 bg-signal-live/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">
          V31 Universal Competition Engine
        </p>

        <p className="mt-1 text-sm text-ink-muted">
          Select any supported competition type. Rules, scoring and
          participant defaults are loaded from the central competition
          registry.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">Competition name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer Open 2026"
            className="field-input"
          />
        </label>

        <label>
          <span className="field-label">Sport / category</span>

          <select
            value={sport}
            onChange={(e) => onSportChange(e.target.value)}
            className="field-input"
          >
            {definitions.map((definition) => (
              <option
                key={definition.sport}
                value={definition.sport}
              >
                {definition.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">
            {sport === "esports"
              ? "Game / title"
              : "Discipline / title"}
          </span>

          <input
            required
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder={
              sport === "esports"
                ? "Street Fighter 6 / Valorant / BGMI"
                : "Open division"
            }
            className="field-input"
          />
        </label>

        <label>
          <span className="field-label">
            Competition type
          </span>

          <select
            value={competitionType}
            onChange={(e) =>
              setCompetitionType(e.target.value as CompetitionType)
            }
            className="field-input"
          >
            <option value="tournament">Tournament</option>
            <option value="league">League</option>
            <option value="season">Season</option>
            <option value="showmatch">Showmatch</option>
            <option value="scrim">Scrim</option>
            <option value="challenge">Challenge</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label>
          <span className="field-label">
            Participant model
          </span>

          <select
            value={participantMode}
            onChange={(e) =>
              setParticipantMode(e.target.value as typeof participantMode)
            }
            className="field-input"
          >
            {PARTICIPANT_MODES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">
            Scoring adapter
          </span>

          <select
            value={scoringMode}
            onChange={(e) =>
              setScoringMode(e.target.value)
            }
            className="field-input"
          >
            <option value="points">Points</option>
            <option value="goals">Goals</option>
            <option value="runs">Runs</option>
            <option value="sets">Sets</option>
            <option value="time">Time</option>
            <option value="attempts">Attempts</option>
            <option value="custom">Custom metric</option>
          </select>
        </label>

        <label>
          <span className="field-label">Format</span>

          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="field-input"
          >
            {FORMATS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">
            Best of / series
          </span>

          <select
            value={bestOf}
            onChange={(e) =>
              setBestOf(Number(e.target.value))
            }
            className="field-input"
          >
            {BEST_OF_VALUES.map((value) => (
              <option key={value} value={value}>
                Best of {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">
            Start date & time
          </span>

          <input
            required
            type="datetime-local"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
            className="field-input"
          />
        </label>

        <label>
          <span className="field-label">
            Broadcast stations / courts
          </span>

          <input
            required
            type="number"
            min={1}
            max={64}
            value={stationCount}
            onChange={(e) =>
              setStationCount(Number(e.target.value))
            }
            className="field-input"
          />
        </label>

        <label className="md:col-span-2">
          <span className="field-label">
            {participantMode === "team"
              ? "Teams"
              : participantMode === "pair"
                ? "Pairs / entries"
                : "Players / entries"}
          </span>

          <textarea
            required
            rows={8}
            value={participantText}
            onChange={(e) =>
              setParticipantText(e.target.value)
            }
            placeholder={
              "Entry One\nEntry Two\nEntry Three\nEntry Four"
            }
            className="field-input min-h-48"
          />

          <div className="mt-2 flex justify-between text-xs">
            <span
              className={
                validCount
                  ? "text-signal-live"
                  : "text-ink-faint"
              }
            >
              {participants.length} unique entries
            </span>

            <span className="text-ink-faint">
              One entry per line
            </span>
          </div>
        </label>

        <label className="md:col-span-2">
          <span className="field-label">
            Custom rules JSON{" "}
            <span className="normal-case text-ink-faint">
              (optional)
            </span>
          </span>

          <textarea
            rows={4}
            value={rulesText}
            onChange={(e) =>
              setRulesText(e.target.value)
            }
            placeholder='{"winPoints":3,"drawPoints":1,"periodMinutes":45}'
            className="field-input font-mono text-xs"
          />
        </label>
      </div>

      <section className="mt-6 rounded-card border border-arena-700 bg-arena-950 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Registry preset
            </p>

            <h2 className="mt-1 font-display text-lg uppercase">
              {preset.label}
            </h2>
          </div>

          <div className="text-right">
            <p className="font-mono text-[10px] uppercase text-ink-faint">
              Capabilities
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              {preset.capabilities.join(" · ")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RuleCard
            label="Competition"
            value={competitionType}
          />

          <RuleCard
            label="Participants"
            value={participantMode}
          />

          <RuleCard
            label="Scoring"
            value={scoringMode}
          />

          <RuleCard
            label="Direction"
            value={
              String(previewRules.direction) ===
              "lower_wins"
                ? "Lower wins"
                : "Higher wins"
            }
          />
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            View generated rules
          </summary>

          <pre className="mt-3 overflow-x-auto rounded-card bg-arena-900 p-4 text-xs text-ink-muted">
            {JSON.stringify(previewRules, null, 2)}
          </pre>
        </details>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center justify-center rounded-card bg-signal-live px-5 font-mono text-xs font-bold uppercase tracking-wide text-arena-950 disabled:opacity-50"
        >
          {submitting
            ? "Creating…"
            : "Create competition"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex min-h-11 items-center justify-center rounded-card border border-arena-600 px-5 font-mono text-xs font-semibold uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-ink"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-card border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}

function RuleCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card border border-arena-700 bg-arena-900 p-3">
      <p className="font-mono text-[10px] uppercase text-ink-faint">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold capitalize">
        {value.replaceAll("_", " ")}
      </p>
    </div>
  );
}
