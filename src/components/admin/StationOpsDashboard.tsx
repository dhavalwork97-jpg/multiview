"use client";

import { useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

type StationHealth = {
  id: string;
  label: string;
  status: "OFFLINE" | "IDLE" | "LIVE" | "ERROR";
  lastHeartbeatAt: string | null;
  currentBitrateKbps: number | null;
  droppedFrames: number | null;
  youtubeLiveStatus: string | null;
  youtubeVideoId: string | null;
  isStale: boolean;
  matches: { id: string; playerOne: { gamertag: string }; playerTwo: { gamertag: string } }[];
};

export function StationOpsDashboard({ tournamentId }: { tournamentId: string }) {
  const [stations, setStations] = useState<StationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "READY" | "ALERT">("ALL");
  const socket = useSocket({ tournamentId });

  async function refresh() {
    try {
      const res = await fetch(`/api/stations?tournamentId=${tournamentId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Station health unavailable");
      const data = await res.json();
      setStations(data.stations ?? []);
      setLastRefreshed(new Date());
    } catch {
      // Keep the last known snapshot visible rather than blanking the board.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    socket.on("station:status", refresh);
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      clearInterval(timer);
      socket.off("station:status", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, socket]);

  const alerting = useMemo(() => stations.filter((s) => s.status === "ERROR" || s.isStale), [stations]);
  const counts = useMemo(() => {
    const c = { LIVE: 0, READY: 0, OFFLINE: 0, ALERT: 0 };
    for (const s of stations) {
      if (s.status === "ERROR" || s.isStale) c.ALERT++;
      else if (s.status === "LIVE") c.LIVE++;
      else if (s.status === "IDLE") c.READY++;
      else c.OFFLINE++;
    }
    return c;
  }, [stations]);
  const visibleStations = useMemo(() => stations.filter((s) => {
    if (filter === "LIVE") return s.status === "LIVE" && !s.isStale;
    if (filter === "READY") return s.status === "IDLE";
    if (filter === "ALERT") return s.status === "ERROR" || s.isStale;
    return true;
  }), [filter, stations]);

  if (loading) return <p className="text-sm text-ink-faint">Loading station health…</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill label="All" count={stations.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        <FilterPill label="Live" count={counts.LIVE} active={filter === "LIVE"} onClick={() => setFilter("LIVE")} />
        <FilterPill label="Ready" count={counts.READY} active={filter === "READY"} onClick={() => setFilter("READY")} />
        <FilterPill label="Alerts" count={counts.ALERT} active={filter === "ALERT"} error onClick={() => setFilter("ALERT")} />
        {filter === "ALERT" && <button type="button" className="sr-only" onClick={() => setFilter("ALL")}>Clear station filter</button>}
        {lastRefreshed && <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-ink-faint">Updated {lastRefreshed.toLocaleTimeString()}</span>}
      </div>

      {alerting.length > 0 && (
        <div className="mb-4 rounded-card border border-signal-error/50 bg-signal-error/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs uppercase tracking-wide text-signal-error">{alerting.length} station{alerting.length === 1 ? "" : "s"} need attention</p>
            <button type="button" onClick={() => setFilter("ALERT")} className="font-mono text-[10px] uppercase tracking-wide text-signal-error underline underline-offset-4">Focus alerts</button>
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-ink-muted sm:grid-cols-2">
            {alerting.map((s) => <li key={s.id}><span className="text-signal-error">{s.label}</span> — {s.isStale ? "heartbeat stale" : "reported ERROR"}</li>)}
          </ul>
        </div>
      )}

      {visibleStations.length === 0 ? (
        <div className="rounded-card border border-arena-700 p-8 text-center text-sm text-ink-faint">No stations match this view.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleStations.map((station) => <StationCard key={station.id} station={station} />)}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, count, active, error, onClick }: { label: string; count: number; active: boolean; error?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-card border px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${active ? (error ? "border-signal-error/60 bg-signal-error/10 text-signal-error" : "border-signal-live/50 bg-signal-live/10 text-signal-live") : "border-arena-600 text-ink-faint hover:border-arena-500 hover:text-ink-muted"}`}>{count} {label}</button>;
}

function StationCard({ station }: { station: StationHealth }) {
  const effectiveStatus = station.isStale ? "ERROR" : station.status;
  const borderClass = effectiveStatus === "ERROR" ? "border-signal-error" : effectiveStatus === "LIVE" ? "border-signal-live/40" : "border-arena-600";
  const heartbeatAge = station.lastHeartbeatAt ? Math.max(0, Math.round((Date.now() - new Date(station.lastHeartbeatAt).getTime()) / 1000)) : null;
  const bitrate = station.currentBitrateKbps;
  const dropped = station.droppedFrames ?? 0;
  const bitrateTone = bitrate == null ? "text-ink-faint" : bitrate < 1500 ? "text-yellow-300" : "text-ink-muted";
  const dropTone = dropped > 0 ? "text-yellow-300" : "text-ink-muted";

  return (
    <article className={`rounded-card border bg-arena-800 p-4 text-sm ${borderClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-lg uppercase">{station.label}</span>
        <StatusPill status={effectiveStatus} />
      </div>
      <div className="mt-2 rounded border border-arena-700 bg-arena-950/60 px-3 py-2">
        {station.matches[0] ? <p className="truncate text-xs text-ink-muted">{station.matches[0].playerOne.gamertag} <span className="text-ink-faint">vs</span> {station.matches[0].playerTwo.gamertag}</p> : <p className="text-xs text-ink-faint">No match assigned · ready for queue</p>}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        <div><dt>Heartbeat</dt><dd className={station.isStale ? "mt-0.5 text-signal-error" : "mt-0.5 text-ink-muted"}>{heartbeatAge == null ? "—" : `${heartbeatAge}s`}</dd></div>
        <div><dt>Bitrate</dt><dd className={`mt-0.5 ${bitrateTone}`}>{bitrate == null ? "—" : `${bitrate} kbps`}</dd></div>
        <div><dt>Dropped</dt><dd className={`mt-0.5 ${dropTone}`}>{dropped}</dd></div>
        <div><dt>YouTube</dt><dd className="mt-0.5 truncate text-ink-muted">{station.youtubeLiveStatus ?? "—"}</dd></div>
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-arena-700 pt-2 text-[10px] text-ink-faint">
        <span>{station.youtubeVideoId ? "Playback ready" : "Playback not linked"}</span>
        <span>{station.status === "LIVE" ? "ON AIR" : station.status}</span>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: StationHealth["status"] }) {
  const styles: Record<StationHealth["status"], string> = { LIVE: "text-signal-live", IDLE: "text-ink-muted", OFFLINE: "text-ink-faint", ERROR: "text-signal-error" };
  return <span className={`font-mono text-[10px] uppercase tracking-widest ${styles[status]}`}>{status}</span>;
}
