"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

type QueuedMatch = {
  id: string;
  round: string | null;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  stationId: string | null;
};

type StationHealth = {
  id: string;
  label: string;
  status: "OFFLINE" | "IDLE" | "LIVE" | "ERROR";
  lastHeartbeatAt: string | null;
  currentBitrateKbps: number | null;
  droppedFrames: number | null;
  isStale: boolean;
  matches: { id: string; playerOne: { gamertag: string }; playerTwo: { gamertag: string } }[];
};

type StreamCredentials = { ingestUrl: string; streamKey: string };
type CredentialsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; credentials: StreamCredentials }
  | { status: "error"; message: string };

export function StationAssignmentBoard({ tournamentId }: { tournamentId: string }) {
  const [queued, setQueued] = useState<QueuedMatch[]>([]);
  const [stations, setStations] = useState<StationHealth[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Keyed by stationId. Credentials only ever live in component state —
  // never written to the URL, localStorage, or anywhere else a stream
  // key (which is bearer-token-equivalent, per src/lib/livekit.ts) could
  // leak beyond this session.
  const [credentials, setCredentials] = useState<Record<string, CredentialsState>>({});
  const socket = useSocket({ tournamentId });

  async function refresh() {
    const [matchesRes, stationsRes] = await Promise.all([
      fetch(`/api/matches?tournamentId=${tournamentId}&status=QUEUED`),
      fetch(`/api/stations?tournamentId=${tournamentId}`),
    ]);
    if (matchesRes.ok) {
      const data = await matchesRes.json();
      setQueued(data.matches.filter((m: QueuedMatch) => !m.stationId));
    }
    if (stationsRes.ok) {
      const data = await stationsRes.json();
      setStations(data.stations);
    }
  }

  useEffect(() => {
    refresh();
    // Station health (heartbeat, bitrate, dropped frames) changes
    // frequently — refresh on the station:status push rather than polling.
    socket.on("station:status", refresh);
    socket.on("match:assigned", refresh);
    return () => {
      socket.off("station:status", refresh);
      socket.off("match:assigned", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, socket]);

  async function assign(matchId: string, stationId: string) {
    setAssigning(matchId);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to assign");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(null);
    }
  }

  // Re-calling this is safe (and sometimes necessary — e.g. a box got
  // swapped): POST /api/stations/:id/ingress tears down any existing
  // ingress for the station first, so an old stream key can't be used to
  // impersonate it afterward. That does mean re-fetching invalidates
  // whatever key was issued before, not just adds a new one.
  async function getStreamingCredentials(stationId: string) {
    setCredentials((prev) => ({ ...prev, [stationId]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/stations/${stationId}/ingress`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to get streaming credentials");
      }
      const data = (await res.json()) as StreamCredentials;
      setCredentials((prev) => ({ ...prev, [stationId]: { status: "ready", credentials: data } }));
    } catch (err) {
      setCredentials((prev) => ({
        ...prev,
        [stationId]: {
          status: "error",
          message: err instanceof Error ? err.message : "Failed to get streaming credentials",
        },
      }));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-ink-muted">
          Queued matches
        </h3>
        {error && <p className="mb-2 text-sm text-signal-error">{error}</p>}
        {queued.length === 0 ? (
          <p className="text-sm text-ink-faint">Nothing waiting on a station.</p>
        ) : (
          <ul className="space-y-2">
            {queued.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-card border border-arena-600 bg-arena-800 px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-corner-p1">{m.playerOne.gamertag}</span>
                  {" vs "}
                  <span className="text-corner-p2">{m.playerTwo.gamertag}</span>
                  {m.round && <span className="ml-2 text-ink-faint">{m.round}</span>}
                </span>
                <select
                  disabled={assigning === m.id}
                  defaultValue=""
                  onChange={(e) => e.target.value && assign(m.id, e.target.value)}
                  className="rounded border border-arena-600 bg-arena-900 px-2 py-1 text-xs"
                >
                  <option value="" disabled>
                    Assign to…
                  </option>
                  {stations
                    .filter((s) => s.status !== "LIVE")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-ink-muted">
          Stations
        </h3>
        <ul className="space-y-2">
          {stations.map((s) => (
            <li
              key={s.id}
              className="rounded-card border border-arena-600 bg-arena-800 px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.label}</span>
                <StatusPill status={s.isStale ? "ERROR" : s.status} />
              </div>
              {s.matches[0] && (
                <p className="mt-1 text-xs text-ink-faint">
                  {s.matches[0].playerOne.gamertag} vs {s.matches[0].playerTwo.gamertag}
                </p>
              )}
              {s.status === "LIVE" && (
                <p className="mt-1 font-mono text-[11px] text-ink-faint">
                  {s.currentBitrateKbps ?? "—"} kbps · {s.droppedFrames ?? 0} dropped frames
                </p>
              )}

              <StreamingCredentialsPanel
                state={credentials[s.id] ?? { status: "idle" }}
                onFetch={() => getStreamingCredentials(s.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StationHealth["status"] }) {
  const styles: Record<StationHealth["status"], string> = {
    LIVE: "text-signal-live",
    IDLE: "text-ink-muted",
    OFFLINE: "text-ink-faint",
    ERROR: "text-signal-error",
  };
  return (
    <span className={`font-mono text-[10px] uppercase tracking-widest ${styles[status]}`}>
      {status}
    </span>
  );
}

function StreamingCredentialsPanel({
  state,
  onFetch,
}: {
  state: CredentialsState;
  onFetch: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [justCopied, setJustCopied] = useState<"url" | "key" | null>(null);

  async function copy(value: string, which: "url" | "key") {
    await navigator.clipboard.writeText(value);
    setJustCopied(which);
    setTimeout(() => setJustCopied((cur) => (cur === which ? null : cur)), 1500);
  }

  if (state.status === "idle" || state.status === "error") {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={onFetch}
          className="rounded border border-arena-600 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live"
        >
          Get streaming credentials
        </button>
        {state.status === "error" && (
          <p className="mt-1 text-xs text-signal-error">{state.message}</p>
        )}
      </div>
    );
  }

  if (state.status === "loading") {
    return <p className="mt-2 text-xs text-ink-faint">Requesting credentials…</p>;
  }

  const { ingestUrl, streamKey } = state.credentials;

  return (
    <div className="mt-2 space-y-1.5 rounded border border-arena-600 bg-arena-900 p-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">
        Paste these into OBS (Settings → Stream → Custom) — treat the stream key like a
        password.
      </p>

      <CredentialRow
        label="Server (RTMP URL)"
        value={ingestUrl}
        masked={false}
        copied={justCopied === "url"}
        onCopy={() => copy(ingestUrl, "url")}
      />
      <CredentialRow
        label="Stream key"
        value={streamKey}
        masked={!revealed}
        copied={justCopied === "key"}
        onCopy={() => copy(streamKey, "key")}
        onToggleReveal={() => setRevealed((r) => !r)}
        revealed={revealed}
      />

      <button
        type="button"
        onClick={onFetch}
        className="pt-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint underline hover:text-ink"
      >
        Regenerate (invalidates the key above)
      </button>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  masked,
  copied,
  onCopy,
  onToggleReveal,
  revealed,
}: {
  label: string;
  value: string;
  masked: boolean;
  copied: boolean;
  onCopy: () => void;
  onToggleReveal?: () => void;
  revealed?: boolean;
}) {
  const displayValue = masked ? "•".repeat(Math.min(value.length, 28)) : value;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 truncate rounded bg-arena-950 px-2 py-1 font-mono text-xs text-ink">
          {displayValue}
        </code>
        {onToggleReveal && (
          <button
            type="button"
            onClick={onToggleReveal}
            className="shrink-0 rounded border border-arena-600 px-1.5 py-1 text-[10px] uppercase text-ink-faint hover:text-ink"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded border border-arena-600 px-1.5 py-1 text-[10px] uppercase text-ink-faint hover:border-signal-live hover:text-signal-live"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
