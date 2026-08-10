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
  isStale: boolean;
  matches: { id: string; playerOne: { gamertag: string }; playerTwo: { gamertag: string } }[];
};

// Previously the only way to see "is station 12 actually OK right now"
// across a whole event was reading Vercel function logs by hand — this is
// the "single screen, N stations, alerts" replacement for that. Pure
// read-only status view; assigning matches/getting stream keys stays on
// StationAssignmentBoard, which this links back to rather than duplicates.
export function StationOpsDashboard({ tournamentId }: { tournamentId: string }) {
  const [stations, setStations] = useState<StationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const socket = useSocket({ tournamentId });

  async function refresh() {
    const res = await fetch(`/api/stations?tournamentId=${tournamentId}`);
    if (res.ok) {
      const data = await res.json();
      setStations(data.stations);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // station:status fires on every real heartbeat refresh (~20s per live
    // station, see src/server/socket/heartbeat.ts) as well as on
    // room_started/room_finished — frequent enough that a poll fallback
    // isn't needed on top of it.
    socket.on("station:status", refresh);
    return () => {
      socket.off("station:status", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, socket]);

  const alerting = useMemo(
    () => stations.filter((s) => s.status === "ERROR" || s.isStale),
    [stations]
  );
  const counts = useMemo(() => {
    const c = { LIVE: 0, IDLE: 0, OFFLINE: 0, ERROR: 0 };
    for (const s of stations) {
      const effective = s.isStale ? "ERROR" : s.status;
      c[effective]++;
    }
    return c;
  }, [stations]);

  if (loading) return <p className="text-sm text-ink-faint">Loading station health…</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SummaryPill label="Live" count={counts.LIVE} tone="live" />
        <SummaryPill label="Idle" count={counts.IDLE} tone="muted" />
        <SummaryPill label="Offline" count={counts.OFFLINE} tone="faint" />
        <SummaryPill label="Alerts" count={counts.ERROR} tone="error" />
        {lastRefreshed && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>

      {alerting.length > 0 && (
        <div className="mb-4 rounded-card border border-signal-error/50 bg-signal-error/10 px-3 py-2">
          <p className="font-mono text-xs uppercase tracking-wide text-signal-error">
            {alerting.length} station{alerting.length === 1 ? "" : "s"} need attention
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
            {alerting.map((s) => (
              <li key={s.id}>
                <span className="text-signal-error">{s.label}</span> —{" "}
                {s.isStale ? "no heartbeat, likely crashed encoder" : "reported ERROR"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stations.map((s) => (
          <StationCard key={s.id} station={s} />
        ))}
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "live" | "muted" | "faint" | "error";
}) {
  const toneClass = {
    live: "border-signal-live/50 text-signal-live",
    muted: "border-arena-600 text-ink-muted",
    faint: "border-arena-600 text-ink-faint",
    error: count > 0 ? "border-signal-error/50 text-signal-error" : "border-arena-600 text-ink-faint",
  }[tone];

  return (
    <span className={`rounded-card border px-3 py-1 font-mono text-xs uppercase tracking-wide ${toneClass}`}>
      {count} {label}
    </span>
  );
}

function StationCard({ station }: { station: StationHealth }) {
  const effectiveStatus = station.isStale ? "ERROR" : station.status;
  const borderClass =
    effectiveStatus === "ERROR"
      ? "border-signal-error"
      : effectiveStatus === "LIVE"
        ? "border-signal-live/40"
        : "border-arena-600";

  const heartbeatAge = station.lastHeartbeatAt
    ? Math.round((Date.now() - new Date(station.lastHeartbeatAt).getTime()) / 1000)
    : null;

  return (
    <div className={`rounded-card border bg-arena-800 p-3 text-sm ${borderClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{station.label}</span>
        <StatusPill status={effectiveStatus} />
      </div>

      {station.matches[0] ? (
        <p className="mt-1 truncate text-xs text-ink-faint">
          {station.matches[0].playerOne.gamertag} vs {station.matches[0].playerTwo.gamertag}
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-faint">No match assigned</p>
      )}

      <dl className="mt-2 space-y-0.5 font-mono text-[11px] text-ink-faint">
        <div className="flex justify-between">
          <dt>Heartbeat</dt>
          <dd className={station.isStale ? "text-signal-error" : ""}>
            {heartbeatAge == null ? "—" : `${heartbeatAge}s ago`}
          </dd>
        </div>
        {station.status === "LIVE" && (
          <>
            <div className="flex justify-between">
              <dt>Bitrate</dt>
              <dd>{station.currentBitrateKbps ?? "—"} kbps</dd>
            </div>
            <div className="flex justify-between">
              <dt>Dropped</dt>
              <dd className={(station.droppedFrames ?? 0) > 0 ? "text-signal-warn" : ""}>
                {station.droppedFrames ?? 0}
              </dd>
            </div>
          </>
        )}
      </dl>
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
