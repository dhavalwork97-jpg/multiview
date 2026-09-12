"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  round: string | null;
  status: "QUEUED" | "LIVE" | "COMPLETED" | "DISPUTED";
  playerOneScore: number;
  playerTwoScore: number;
  playerOne: { id: string; gamertag: string } | null;
  playerTwo: { id: string; gamertag: string } | null;
  station: { id: string; label: string; status: string } | null;
};

type Station = {
  id: string;
  label: string;
  status: string;
  currentBitrateKbps: number | null;
  droppedFrames: number | null;
  youtubeLiveStatus: string | null;
  isStale: boolean;
  matches: Array<{ id: string; round: string | null; status: string; playerOneScore: number; playerTwoScore: number; playerOne: { id: string; gamertag: string } | null; playerTwo: { id: string; gamertag: string } | null }>;
};

const health = (station: Station) => {
  if (station.isStale || station.status === "OFFLINE") return { label: "ATTENTION", tone: "#f59e0b" };
  if (station.status === "ERROR") return { label: "ERROR", tone: "#ef4444" };
  if (station.matches[0]?.status === "LIVE") return { label: "LIVE", tone: "#22c55e" };
  if (station.matches[0]?.status === "QUEUED") return { label: "READY", tone: "#60a5fa" };
  return { label: "IDLE", tone: "#94a3b8" };
};

export default function OperationsClient({ tournamentId }: { tournamentId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNASSIGNED" | "LIVE">("ALL");

  const load = useCallback(async () => {
    try {
      const [matchesResponse, stationsResponse] = await Promise.all([
        fetch(`/api/matches?tournamentId=${encodeURIComponent(tournamentId)}&status=QUEUED`, { cache: "no-store" }),
        fetch(`/api/stations?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
      ]);
      if (!matchesResponse.ok || !stationsResponse.ok) throw new Error("Unable to load tournament operations data");
      const queued = (await matchesResponse.json()) as { matches: Match[] };
      const stationPayload = (await stationsResponse.json()) as { stations: Station[] };
      setMatches(queued.matches ?? []);
      setStations(stationPayload.stations ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load operations data");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const assignedIds = useMemo(() => new Set(stations.flatMap((station) => station.matches.map((match) => match.id))), [stations]);
  const unassigned = matches.filter((match) => !assignedIds.has(match.id));
  const visibleMatches = filter === "UNASSIGNED" ? unassigned : matches;

  async function assign(matchId: string, stationId: string | null) {
    setBusy(matchId);
    setError(null);
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/station`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Station assignment failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Station assignment failed");
    } finally {
      setBusy(null);
    }
  }

  const liveStations = stations.filter((s) => s.matches[0]?.status === "LIVE").length;
  const attentionStations = stations.filter((s) => health(s).label === "ATTENTION" || health(s).label === "ERROR").length;

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <div style={eyebrow}>FGC CONTROL ROOM 2.0</div>
            <h1 style={{ margin: "7px 0 0", fontSize: 34, letterSpacing: "-.03em" }}>Tournament Operations</h1>
            <p style={{ margin: "7px 0 0", color: "#8b91a3", fontSize: 13 }}>Competition state, station state and broadcast readiness in one operator surface.</p>
          </div>
          <a href={`/broadcast/${tournamentId}/control-room`} style={secondaryButton}>← Broadcast Studio</a>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <Metric label="STATIONS" value={String(stations.length)} detail={`${stations.filter((s) => s.status !== "OFFLINE").length} online`} />
          <Metric label="LIVE" value={String(liveStations)} detail="matches on air" />
          <Metric label="UNASSIGNED" value={String(unassigned.length)} detail="queued matches" />
          <Metric label="ATTENTION" value={String(attentionStations)} detail="needs operator review" danger={attentionStations > 0} />
        </section>

        {error && <div style={{ ...panel, borderColor: "#7f1d1d", color: "#fecaca", marginBottom: 14 }}>⚠ {error}</div>}

        <section style={{ ...panel, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div><div style={eyebrow}>STATION GRID</div><h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Live infrastructure</h2></div>
            <div style={{ display: "flex", gap: 7 }}>
              {(["ALL", "LIVE", "UNASSIGNED"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} style={filter === item ? activeButton : filterButton}>{item}</button>)}
            </div>
          </div>
          {loading ? <div style={empty}>Loading station telemetry…</div> : stations.length === 0 ? <div style={empty}>No stations are registered for this tournament.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 10 }}>
            {stations.map((station) => {
              const state = health(station);
              const current = station.matches[0];
              return <article key={station.id} style={{ ...card, borderColor: state.label === "LIVE" ? "#166534" : state.label === "ATTENTION" || state.label === "ERROR" ? "#78350f" : "#252936" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong style={{ fontSize: 15 }}>{station.label}</strong><span style={{ ...statusPill, color: state.tone, borderColor: `${state.tone}55` }}>● {state.label}</span></div>
                <div style={{ marginTop: 16, minHeight: 64 }}>
                  {current ? <><div style={{ fontSize: 12, color: "#9ca3af" }}>{current.round ?? "MATCH"} · {current.status}</div><div style={{ marginTop: 6, fontWeight: 800 }}>{current.playerOne?.gamertag ?? "TBD"} <span style={{ color: "#6b7280" }}>{current.playerOneScore}–{current.playerTwoScore}</span> {current.playerTwo?.gamertag ?? "TBD"}</div></> : <div style={{ color: "#656b7b", fontSize: 12 }}>No match assigned</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 10, color: "#777e90" }}><div>BITRATE<br /><b style={{ color: "#c9ced9" }}>{station.currentBitrateKbps ?? "—"} kbps</b></div><div>DROPPED<br /><b style={{ color: "#c9ced9" }}>{station.droppedFrames ?? "—"}</b></div></div>
              </article>;
            })}
          </div>}
        </section>

        <section style={panel}>
          <div style={{ marginBottom: 14 }}><div style={eyebrow}>MATCH QUEUE</div><h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Assignment desk</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: "#747b8c" }}>Assignments are atomic and conflict-protected. A station can never receive two queued/live matches.</p></div>
          {visibleMatches.length === 0 ? <div style={empty}>{filter === "UNASSIGNED" ? "All queued matches are assigned." : "No queued matches are available."}</div> : <div style={{ display: "grid", gap: 8 }}>
            {visibleMatches.map((match) => <div key={match.id} style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr auto", gap: 12, alignItems: "center", padding: 13, border: "1px solid #252936", borderRadius: 13, background: "#090b10" }}>
              <div><div style={{ fontSize: 10, color: "#737a8b", letterSpacing: ".12em" }}>{match.round ?? "QUEUED"} · {match.id.slice(0, 8)}</div><div style={{ marginTop: 5, fontWeight: 800 }}>{match.playerOne?.gamertag ?? "TBD"} <span style={{ color: "#5e6575" }}>vs</span> {match.playerTwo?.gamertag ?? "TBD"}</div></div>
              <select value={match.station?.id ?? ""} disabled={busy === match.id} onChange={(event) => void assign(match.id, event.target.value || null)} style={select}><option value="">Unassigned</option>{stations.map((station) => { const occupied = station.matches.some((item) => item.id !== match.id && (item.status === "QUEUED" || item.status === "LIVE")); return <option key={station.id} value={station.id} disabled={occupied}>{station.label}{occupied ? " · OCCUPIED" : ""}</option>; })}</select>
              <span style={{ fontSize: 10, color: busy === match.id ? "#a78bfa" : "#667085", minWidth: 72, textAlign: "right" }}>{busy === match.id ? "SYNCING…" : match.station ? "ASSIGNED" : "READY"}</span>
            </div>)}
          </div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail, danger }: { label: string; value: string; detail: string; danger?: boolean }) { return <div style={panel}><div style={eyebrow}>{label}</div><div style={{ marginTop: 8, fontSize: 25, fontWeight: 850, color: danger ? "#f59e0b" : "#fff" }}>{value}</div><div style={{ marginTop: 3, fontSize: 11, color: "#666d7e" }}>{detail}</div></div>; }

const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 18, padding: 18 } as const;
const card = { background: "#090b10", border: "1px solid #252936", borderRadius: 14, padding: 15 } as const;
const eyebrow = { fontSize: 10, letterSpacing: ".15em", color: "#666d7e", fontWeight: 700 } as const;
const secondaryButton = { border: "1px solid #303543", borderRadius: 9, padding: "10px 13px", color: "#c4b5fd", textDecoration: "none", fontSize: 11, fontWeight: 700 } as const;
const filterButton = { border: "1px solid #2b2f3c", borderRadius: 8, padding: "8px 10px", background: "#11131a", color: "#7d8495", fontSize: 10, fontWeight: 800, cursor: "pointer" } as const;
const activeButton = { ...filterButton, background: "#7c3aed", borderColor: "#8b5cf6", color: "#fff" } as const;
const statusPill = { border: "1px solid", borderRadius: 999, padding: "4px 7px", fontSize: 9, letterSpacing: ".08em", fontWeight: 800 } as const;
const select = { width: "100%", background: "#11131a", color: "#e5e7eb", border: "1px solid #303543", borderRadius: 8, padding: "9px 10px", fontSize: 12 } as const;
const empty = { padding: 28, border: "1px dashed #2a2e3a", borderRadius: 12, color: "#697083", textAlign: "center", fontSize: 12 } as const;
