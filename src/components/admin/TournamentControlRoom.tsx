"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import Link from "next/link";

type BroadcastScene =
  | "OFFLINE"
  | "WAITING"
  | "MATCH"
  | "BREAK"
  | "INTERMISSION"
  | "RESULTS";

type BroadcastState = {
  scene: BroadcastScene;
  stationId: string | null;
  matchId: string | null;
  overlay: Record<string, unknown> | null;
  updatedAt?: string | null;
};

type Station = {
  id: string;
  label: string;
  status: "OFFLINE" | "IDLE" | "LIVE" | "ERROR";
  lastHeartbeatAt: string | null;
  currentBitrateKbps: number | null;
  droppedFrames: number | null;
  isStale: boolean;
  youtubeVideoId: string | null;
  youtubeLiveStatus: string | null;
  matches: Match[];
};

type Match = {
  id: string;
  round?: string | null;
  status: "QUEUED" | "LIVE" | "COMPLETED" | "DISPUTED";
  playerOneScore: number;
  playerTwoScore: number;
  startedAt?: string | null;
  playerOne: { id: string; gamertag: string };
  playerTwo: { id: string; gamertag: string };
  station?: { id: string; label: string; youtubeVideoId?: string | null; status?: string } | null;
};

type Credentials = { ingestUrl: string; streamKey: string };

export function TournamentControlRoom({ tournamentId }: { tournamentId: string }) {
  const [broadcast, setBroadcast] = useState<BroadcastState>({
  scene: "OFFLINE",
  stationId: null,
  matchId: null,
  overlay: null,
});
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [queued, setQueued] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, Credentials>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newStation, setNewStation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; action: string; entityType: string; createdAt: string; metadata?: Record<string, unknown> | null }>>([]);
  const [canOperate, setCanOperate] = useState(true);
  const [metrics, setMetrics] = useState<{ views: number; watchSeconds: number; watchHours: number }>({ views: 0, watchSeconds: 0, watchHours: 0 });
  const [incidentCount, setIncidentCount] = useState(0);
  const [incidents, setIncidents] = useState<Array<{ id: string; severity: "INFO" | "WARNING" | "CRITICAL"; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"; title: string; details?: string | null; createdAt: string }>>([]);
  const [health, setHealth] = useState<{ overall: "ok" | "warning" | "error"; checkedAt: string; checks: Record<string, { status: "ok" | "warning" | "error"; detail: string }>; youtubeQuota: { used: number; budget: number; remaining: number; blockedUntil: string | null } } | null>(null);
  const socket = useSocket({ tournamentId });

  const refresh = useCallback(async () => {
    try {
      const [snapshotRes, healthRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/control-room`, { cache: "no-store" }),
        fetch(`/api/tournaments/${tournamentId}/health`, { cache: "no-store" }),
      ]);
      if (!snapshotRes.ok) throw new Error("Failed to load control room");
      const snapshot = await snapshotRes.json();
      setStations(snapshot.stations ?? []);
      setQueued(snapshot.queued ?? []);
      setActivity(snapshot.activity ?? []);
      setCanOperate(snapshot.canOperate !== false);
      setMetrics(snapshot.metrics ?? { views: 0, watchSeconds: 0, watchHours: 0 });
      setIncidents(snapshot.incidents ?? []);
      setIncidentCount((snapshot.incidents ?? []).length);
	  setBroadcast(snapshot.broadcast ?? {
      scene: "OFFLINE",
      stationId: null,
      matchId: null,
      overlay: null,
    });
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh control room");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
  void refresh();

  const onUpdate = () => void refresh();
  const onBroadcastUpdate = () => void refresh();

  socket.on("station:status", onUpdate);
  socket.on("match:updated", onUpdate);
  socket.on("match:assigned", onUpdate);
  socket.on("broadcast:updated", onBroadcastUpdate);

  const timer = setInterval(onUpdate, 10000);

  return () => {
    clearInterval(timer);
    socket.off("station:status", onUpdate);
    socket.off("match:updated", onUpdate);
    socket.off("match:assigned", onUpdate);
    socket.off("broadcast:updated", onBroadcastUpdate);
  };
}, [refresh, socket]);

  const counts = useMemo(() => {
    const result = { live: 0, ready: 0, offline: 0, alerts: 0 };
    for (const station of stations) {
      if (station.status === "LIVE" && !station.isStale) result.live++;
      else if (station.status === "IDLE") result.ready++;
      else if (station.status === "ERROR" || station.isStale) result.alerts++;
      else result.offline++;
    }
    return result;
  }, [stations]);

  async function createStation() {
    const label = newStation.trim();
    if (!label) return;
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create station");
      setNewStation("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create station");
    } finally {
      setBusy(null);
    }
  }

  async function assign(matchId: string, stationId: string) {
    setBusy(matchId);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to assign match");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign match");
    } finally {
      setBusy(null);
    }
  }

  async function setMatchStatus(matchId: string, status: "LIVE" | "COMPLETED", winnerId?: string) {
    setBusy(matchId);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(winnerId ? { winnerId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Failed to mark match ${status.toLowerCase()}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Match update failed");
    } finally {
      setBusy(null);
    }
  }

  async function endStationStream(stationId: string) {
    setBusy(`end:${stationId}`);
    setError(null);
    try {
      const res = await fetch(`/api/stations/${stationId}/youtube-session`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to end station stream");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end station stream");
    } finally {
      setBusy(null);
    }
  }

  async function reconcile() {
    setBusy("reconcile"); setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/reconcile`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Reconciliation failed");
      if (data.warnings?.length) setError(data.warnings.join(" "));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Reconciliation failed"); }
    finally { setBusy(null); }
  }

  async function reconcileEgress() {
    setBusy("egress-reconcile"); setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/reconcile-egress`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Egress reconciliation failed");
      if (data.errors?.length) setError(data.errors.join(" "));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Egress reconciliation failed"); }
    finally { setBusy(null); }
  }

  async function updateIncident(incidentId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    setBusy(`incident:${incidentId}`); setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/incidents/${incidentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update incident");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to update incident"); }
    finally { setBusy(null); }
  }

  async function verifyYouTube(stationId: string) {
    setBusy(`verify:${stationId}`); setError(null);
    try {
      const res = await fetch(`/api/stations/${stationId}/youtube-status/verify`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "YouTube verification failed");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "YouTube verification failed"); }
    finally { setBusy(null); }
  }

  async function getCredentials(stationId: string) {
    setBusy(`key:${stationId}`);
    setError(null);
    try {
      const res = await fetch(`/api/stations/${stationId}/ingress`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to prepare YouTube stream");
      setCredentials((old) => ({ ...old, [stationId]: { ingestUrl: data.ingestUrl, streamKey: data.streamKey } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to prepare YouTube stream");
    } finally {
      setBusy(null);
    }
  }

async function sendBroadcastCommand(
  command:
    | { type: "SET_SCENE"; scene: BroadcastScene }
    | { type: "SELECT_STATION"; stationId: string }
    | { type: "SELECT_MATCH"; matchId: string }
    | { type: "UPDATE_OVERLAY"; overlay: Record<string, unknown> }
    | { type: "CLEAR_SELECTION" },
) {
  setBroadcastBusy(true);
  setError(null);

  try {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/broadcast`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error ?? "Broadcast command failed");
    }

    if (data.state) {
      setBroadcast(data.state);
    }

    await refresh();
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "Failed to update broadcast director",
    );
  } finally {
    setBroadcastBusy(false);
  }
}

  if (loading) return <p className="text-sm text-ink-faint">Loading control room…</p>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-card border border-signal-error/50 bg-signal-error/10 px-3 py-2 text-sm text-signal-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-mono text-xs uppercase">Dismiss</button>
        </div>
      )}

      {!canOperate && <div className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs text-ink-faint">Read-only operator view. Ask an organization Admin/Owner for operational permissions.</div>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Live" value={counts.live} tone="live" />
        <Metric label="Ready" value={counts.ready} />
        <Metric label="Offline" value={counts.offline} />
        <Metric label="Attention" value={counts.alerts} tone={counts.alerts ? "error" : undefined} />
      </div>

      {health && (
        <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">System health</p>
              <h2 className="font-display text-xl uppercase tracking-wide">Control plane diagnostics</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/tournaments/${tournamentId}/report`} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Event report</Link>
              <button onClick={() => void reconcile()} disabled={!canOperate || busy === "reconcile"} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase disabled:opacity-40">{busy === "reconcile" ? "Checking…" : "Reconcile"}</button>
              <button onClick={() => void reconcileEgress()} disabled={!canOperate || busy === "egress-reconcile"} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase disabled:opacity-40">{busy === "egress-reconcile" ? "Checking egress…" : "Repair playback"}</button>
              <span className={`font-mono text-[10px] uppercase ${health.overall === "ok" ? "text-signal-live" : health.overall === "warning" ? "text-yellow-300" : "text-signal-error"}`}>{health.overall}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(health.checks).map(([name, check]) => (
              <div key={name} className="rounded-card border border-arena-700 bg-arena-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{name}</span>
                  <span className={`font-mono text-[10px] uppercase ${check.status === "ok" ? "text-signal-live" : check.status === "warning" ? "text-yellow-300" : "text-signal-error"}`}>{check.status}</span>
                </div>
                <p className="mt-1 text-xs text-ink-faint">{check.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

<section className="rounded-card border border-arena-600 bg-arena-900 p-4">
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
        Broadcast director
      </p>
      <h2 className="font-display text-xl uppercase tracking-wide">
        Program control
      </h2>
    </div>

    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase text-ink-faint">
        Current scene
      </span>
      <span className="rounded-card border border-signal-live/40 px-2 py-1 font-mono text-[10px] uppercase text-signal-live">
        {broadcast.scene}
      </span>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
    {(
      [
        "OFFLINE",
        "WAITING",
        "MATCH",
        "BREAK",
        "INTERMISSION",
        "RESULTS",
      ] as BroadcastScene[]
    ).map((scene) => (
      <button
        key={scene}
        disabled={!canOperate || broadcastBusy}
        onClick={() =>
          void sendBroadcastCommand({
            type: "SET_SCENE",
            scene,
          })
        }
        className={`rounded-card border px-3 py-3 font-mono text-[10px] uppercase tracking-wide transition disabled:opacity-40 ${
          broadcast.scene === scene
            ? "border-signal-live bg-signal-live/10 text-signal-live"
            : "border-arena-600 bg-arena-950 text-ink-faint hover:border-arena-500"
        }`}
      >
        {scene}
      </button>
    ))}
  </div>

  <div className="mt-4 grid gap-4 lg:grid-cols-2">
    <div className="rounded-card border border-arena-700 bg-arena-950 p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        Program station
      </p>

      <select
        value={broadcast.stationId ?? ""}
        disabled={!canOperate || broadcastBusy}
        onChange={(e) => {
          if (e.target.value) {
            void sendBroadcastCommand({
              type: "SELECT_STATION",
              stationId: e.target.value,
            });
          }
        }}
        className="w-full rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs"
      >
        <option value="" disabled>
          Select station…
        </option>

        {stations.map((station) => (
          <option key={station.id} value={station.id}>
            {station.label} · {station.status}
          </option>
        ))}
      </select>

      {broadcast.stationId && (
        <p className="mt-2 text-[10px] text-ink-faint">
          Selected station controls the current program source.
        </p>
      )}
    </div>

    <div className="rounded-card border border-arena-700 bg-arena-950 p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        Featured match
      </p>

      <select
        value={broadcast.matchId ?? ""}
        disabled={!canOperate || broadcastBusy}
        onChange={(e) => {
          if (e.target.value) {
            void sendBroadcastCommand({
              type: "SELECT_MATCH",
              matchId: e.target.value,
            });
          }
        }}
        className="w-full rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs"
      >
        <option value="" disabled>
          Select match…
        </option>

        {stations.flatMap((station) =>
          station.matches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.playerOne.gamertag} vs {match.playerTwo.gamertag}
            </option>
          )),
        )}

        {queued.map((match) => (
          <option key={match.id} value={match.id}>
            {match.playerOne.gamertag} vs {match.playerTwo.gamertag}
          </option>
        ))}
      </select>
    </div>
  </div>

  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-arena-700 pt-4">
    <div className="font-mono text-[10px] uppercase text-ink-faint">
      {broadcastBusy ? "Applying broadcast command…" : "Persistent director state"}
    </div>

    <button
      disabled={
        !canOperate ||
        broadcastBusy ||
        (!broadcast.stationId && !broadcast.matchId)
      }
      onClick={() =>
        void sendBroadcastCommand({
          type: "CLEAR_SELECTION",
        })
      }
      className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase disabled:opacity-40"
    >
      Clear selection
    </button>
  </div>
</section>

      <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Broadcast floor</p>
            <h2 className="font-display text-xl uppercase tracking-wide">All stations</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={newStation}
              onChange={(e) => setNewStation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createStation()}
              placeholder="Station 05"
              className="w-40 rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-sm outline-none focus:border-signal-live"
            />
            <button
              disabled={!canOperate || busy === "create" || !newStation.trim()}
              onClick={() => void createStation()}
              className="rounded-card border border-signal-live/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-signal-live disabled:opacity-40"
            >
              Add station
            </button>
          </div>
        </div>

        {stations.length === 0 ? (
          <p className="rounded-card border border-dashed border-arena-600 p-6 text-center text-sm text-ink-faint">Create the first broadcast station above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                queued={queued.filter((m) => !m.station)}
                credentials={credentials[station.id]}
                revealed={!!showKeys[station.id]}
                busy={busy}
                onAssign={(matchId) => void assign(matchId, station.id)}
                onStart={(matchId) => void setMatchStatus(matchId, "LIVE")}
                onEnd={(matchId, winnerId) => void setMatchStatus(matchId, "COMPLETED", winnerId)}
                onCredentials={() => void getCredentials(station.id)}
                onEndStation={() => void endStationStream(station.id)}
                onToggleKey={() => setShowKeys((old) => ({ ...old, [station.id]: !old[station.id] }))}
                canOperate={canOperate}
                onVerifyYouTube={() => void verifyYouTube(station.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Queue</p>
            <h2 className="font-display text-xl uppercase tracking-wide">Next matches</h2>
          </div>
          <span className="font-mono text-[10px] text-ink-faint">{queued.length} queued</span>
        </div>
        <div className="space-y-2">
          {queued.filter((m) => !m.station).map((match) => (
            <div key={match.id} className="flex flex-col gap-3 rounded-card border border-arena-600 bg-arena-800 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium"><span className="text-corner-p1">{match.playerOne.gamertag}</span> <span className="text-ink-faint">vs</span> <span className="text-corner-p2">{match.playerTwo.gamertag}</span></p>
                <p className="mt-0.5 font-mono text-[10px] uppercase text-ink-faint">{match.round ?? "Upcoming"}</p>
              </div>
              <select
                defaultValue=""
                disabled={!canOperate || busy === match.id}
                onChange={(e) => e.target.value && void assign(match.id, e.target.value)}
                className="rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-xs"
              >
                <option value="" disabled>Assign station…</option>
                {stations.filter((s) => s.status !== "LIVE" && s.status !== "ERROR").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          ))}
          {queued.filter((m) => !m.station).length === 0 && <p className="text-sm text-ink-faint">No unassigned queued matches.</p>}
        </div>
      </section>

      <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Incidents</p>
            <h2 className="font-display text-xl uppercase tracking-wide">Open issues</h2>
          </div>
          <span className="font-mono text-[10px] uppercase text-ink-faint">{incidentCount} active</span>
        </div>
        {incidents.length === 0 ? (
          <p className="text-sm text-ink-faint">No open incidents. The event control plane is clear.</p>
        ) : (
          <div className="space-y-2">
            {incidents.map((incident) => (
              <div key={incident.id} className="rounded-card border border-arena-700 bg-arena-950 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] uppercase ${incident.severity === "CRITICAL" ? "text-signal-error" : incident.severity === "WARNING" ? "text-yellow-300" : "text-ink-faint"}`}>{incident.severity}</span>
                      <span className="font-mono text-[10px] uppercase text-ink-faint">{incident.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{incident.title}</p>
                    {incident.details && <p className="mt-1 text-xs text-ink-faint">{incident.details}</p>}
                  </div>
                  {canOperate && <div className="flex gap-2">
                    {incident.status === "OPEN" && <button disabled={busy === `incident:${incident.id}`} onClick={() => void updateIncident(incident.id, "ACKNOWLEDGED")} className="rounded-card border border-arena-600 px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-40">Acknowledge</button>}
                    {incident.status !== "RESOLVED" && <button disabled={busy === `incident:${incident.id}`} onClick={() => void updateIncident(incident.id, "RESOLVED")} className="rounded-card border border-signal-live/40 px-2 py-1 font-mono text-[10px] uppercase text-signal-live disabled:opacity-40">Resolve</button>}
                  </div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Operations log</p>
            <h2 className="font-display text-xl uppercase tracking-wide">Recent activity</h2>
          </div>
          <span className="font-mono text-[10px] uppercase text-ink-faint">Last 30 events</span>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-ink-faint">No operator activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-arena-700 rounded-card border border-arena-700">
            {activity.slice(0, 10).map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink">{event.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-ink-faint">{event.entityType}{typeof event.metadata?.entityId === "string" ? ` · ${event.metadata.entityId.slice(0, 10)}` : ""}</p>
                </div>
                <time className="font-mono text-[10px] text-ink-faint" dateTime={event.createdAt}>
                  {new Date(event.createdAt).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] leading-5 text-ink-faint">
        YouTube is used as the station playback transport, but the app does not poll YouTube in the background. Start match creates one unlisted, embeddable station broadcast when needed and later matches reuse it. End a match advances the bracket without touching YouTube; use “End station stream” only when that physical station is finished for the event.
      </p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "live" | "error" }) {
  const color = tone === "live" ? "text-signal-live" : tone === "error" ? "text-signal-error" : "text-ink";
  return <div className="rounded-card border border-arena-600 bg-arena-900 p-3"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p><p className={`mt-1 font-display text-2xl ${color}`}>{value}</p></div>;
}

function StationCard({
  station,
  queued,
  credentials,
  revealed,
  busy,
  onAssign,
  onStart,
  onEnd,
  onCredentials,
  onEndStation,
  onToggleKey,
  canOperate,
  onVerifyYouTube,
}: {
  station: Station;
  queued: Match[];
  credentials?: Credentials;
  revealed: boolean;
  busy: string | null;
  onAssign: (matchId: string) => void;
  onStart: (matchId: string) => void;
  onEnd: (matchId: string, winnerId: string) => void;
  onCredentials: () => void;
  onEndStation: () => void;
  onToggleKey: () => void;
  canOperate: boolean;
  onVerifyYouTube: () => void;
}) {
  const match = station.matches[0];
  const effective = station.isStale ? "ERROR" : station.status;
  const health = effective === "LIVE" ? "HEALTHY" : effective === "ERROR" ? "ATTENTION" : effective === "IDLE" ? "READY" : "OFFLINE";
  const healthClass = health === "HEALTHY" ? "text-signal-live" : health === "ATTENTION" ? "text-signal-error" : "text-ink-faint";
  const age = station.lastHeartbeatAt ? Math.max(0, Math.round((Date.now() - new Date(station.lastHeartbeatAt).getTime()) / 1000)) : null;

  return (
    <article className={`rounded-card border p-4 ${effective === "LIVE" ? "border-signal-live/40 bg-arena-800" : effective === "ERROR" ? "border-signal-error/60 bg-arena-800" : "border-arena-600 bg-arena-800"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg uppercase tracking-wide">{station.label}</p>
          <p className={`font-mono text-[10px] uppercase tracking-widest ${healthClass}`}>{health} · {station.youtubeLiveStatus ?? "no YouTube stream"}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${effective === "LIVE" ? "bg-signal-live" : effective === "ERROR" ? "bg-signal-error" : "bg-arena-600"}`} />
      </div>

      <div className="mt-4 rounded-card border border-arena-600 bg-arena-950 p-3">
        {match ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Current match</p>
            <p className="mt-1 font-medium"><span className="text-corner-p1">{match.playerOne.gamertag}</span> <span className="text-ink-faint">vs</span> <span className="text-corner-p2">{match.playerTwo.gamertag}</span></p>
            <p className="mt-1 font-mono text-[10px] text-ink-faint">{match.round ?? "Match"} · {match.status}</p>
            <div className="mt-3 flex gap-2">
              {match.status === "QUEUED" && <button disabled={!canOperate || busy === match.id} onClick={() => onStart(match.id)} className="rounded-card border border-signal-live/50 px-3 py-1.5 font-mono text-[10px] uppercase text-signal-live disabled:opacity-40">Start match</button>}
              {match.status === "LIVE" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={!canOperate || busy === match.id}
                    onClick={() => onEnd(match.id, match.playerOne.id)}
                    className="rounded-card border border-corner-p1/50 px-3 py-1.5 font-mono text-[10px] uppercase text-corner-p1 disabled:opacity-40"
                  >
                    End · {match.playerOne.gamertag} wins
                  </button>
                  <button
                    disabled={!canOperate || busy === match.id}
                    onClick={() => onEnd(match.id, match.playerTwo.id)}
                    className="rounded-card border border-corner-p2/50 px-3 py-1.5 font-mono text-[10px] uppercase text-corner-p2 disabled:opacity-40"
                  >
                    End · {match.playerTwo.gamertag} wins
                  </button>
                </div>
              )}
              {station.youtubeVideoId && <a href={`https://www.youtube.com/watch?v=${station.youtubeVideoId}`} target="_blank" rel="noreferrer" className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-[10px] uppercase text-ink-muted hover:text-ink">Open stream</a>}
              {station.youtubeVideoId && <button disabled={!canOperate || busy === `verify:${station.id}`} onClick={onVerifyYouTube} className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-40">{busy === `verify:${station.id}` ? "Verifying…" : "Verify YouTube"}</button>}
              {station.youtubeVideoId && <button disabled={!canOperate || busy === `end:${station.id}`} onClick={onEndStation} className="rounded-card border border-signal-error/50 px-3 py-1.5 font-mono text-[10px] uppercase text-signal-error disabled:opacity-40">{busy === `end:${station.id}` ? "Ending…" : "End station stream"}</button>}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-faint">No match on this station.</p>
            <select defaultValue="" disabled={!canOperate} onChange={(e) => e.target.value && onAssign(e.target.value)} className="mt-2 w-full rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs">
              <option value="" disabled>Assign next match…</option>
              {queued.map((m) => <option key={m.id} value={m.id}>{m.playerOne.gamertag} vs {m.playerTwo.gamertag}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] text-ink-faint">
        <div><span className="block uppercase">Heartbeat</span><span className={station.isStale ? "text-signal-error" : "text-ink-muted"}>{age == null ? "—" : `${age}s`}</span></div>
        <div><span className="block uppercase">YouTube</span><span className="text-ink-muted">{station.youtubeLiveStatus ?? "—"}</span></div>
        <div><span className="block uppercase">Video</span><span className="text-ink-muted">{station.youtubeVideoId ? "READY" : "—"}</span></div>
      </div>

      <div className="mt-3 border-t border-arena-600 pt-3">
        <button disabled={!canOperate || busy === `key:${station.id}`} onClick={onCredentials} className="font-mono text-[10px] uppercase tracking-wide text-ink-faint underline hover:text-signal-live disabled:opacity-40">
          {busy === `key:${station.id}` ? "Preparing…" : credentials ? "Refresh / reuse OBS credentials" : "Get OBS credentials"}
        </button>
        {credentials && (
          <div className="mt-2 space-y-1.5">
            <div><p className="text-[9px] uppercase text-ink-faint">Server</p><div className="flex gap-1"><code className="min-w-0 flex-1 truncate rounded bg-arena-950 px-2 py-1 text-[10px]">{credentials.ingestUrl}</code><button onClick={() => navigator.clipboard.writeText(credentials.ingestUrl)} className="rounded border border-arena-600 px-2 text-[9px] uppercase">Copy</button></div></div>
            <div><p className="text-[9px] uppercase text-ink-faint">Stream key</p><div className="flex gap-1"><code className="min-w-0 flex-1 truncate rounded bg-arena-950 px-2 py-1 text-[10px]">{revealed ? credentials.streamKey : "•".repeat(Math.min(24, credentials.streamKey.length))}</code><button onClick={onToggleKey} className="rounded border border-arena-600 px-2 text-[9px] uppercase">{revealed ? "Hide" : "Show"}</button><button onClick={() => navigator.clipboard.writeText(credentials.streamKey)} className="rounded border border-arena-600 px-2 text-[9px] uppercase">Copy</button></div></div>
          </div>
        )}
      </div>
    </article>
  );
}
