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

export function StationAssignmentBoard({ tournamentId }: { tournamentId: string }) {
  const [queued, setQueued] = useState<QueuedMatch[]>([]);
  const [stations, setStations] = useState<StationHealth[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
