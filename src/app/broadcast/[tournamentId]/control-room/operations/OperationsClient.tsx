"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

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

type AuditEntry = { id: string; action: string; entityType: string; entityId: string | null; metadata: Record<string, unknown> | null; createdAt: string; actorUserId: string | null };

type PendingAssignment = { match: Match; stationId: string | null; stationLabel: string; previousLabel: string };

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
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNASSIGNED" | "LIVE">("ALL");
  const [connection, setConnection] = useState<"LIVE" | "OFFLINE">("OFFLINE");
  const [runAcknowledged, setRunAcknowledged] = useState(false);
  const [pending, setPending] = useState<PendingAssignment | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [matchesResponse, stationsResponse, auditResponse] = await Promise.all([
        fetch(`/api/matches?tournamentId=${encodeURIComponent(tournamentId)}&status=QUEUED`, { cache: "no-store" }),
        fetch(`/api/stations?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
        fetch(`/api/audit?tournamentId=${encodeURIComponent(tournamentId)}&limit=12`, { cache: "no-store" }),
      ]);
      if (!matchesResponse.ok || !stationsResponse.ok) throw new Error("Unable to load tournament operations data");
      const queued = (await matchesResponse.json()) as { matches: Match[] };
      const stationPayload = (await stationsResponse.json()) as { stations: Station[] };
      const auditPayload = auditResponse.ok ? ((await auditResponse.json()) as { entries: AuditEntry[] }) : { entries: [] };
      setMatches(queued.matches ?? []);
      setStations(stationPayload.stations ?? []);
      setAudit(auditPayload.entries ?? []);
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

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || window.location.origin;
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });
    const onConnect = () => { socket.emit("join:tournament", tournamentId); setConnection("LIVE"); };
    const onDisconnect = () => setConnection("OFFLINE");
    const onMatchUpdated = (event: { tournamentId?: string; matchId?: string }) => { if (event.tournamentId !== tournamentId || !event.matchId) return; void load(); };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("match:updated", onMatchUpdated);
    socket.on("broadcast:updated", onMatchUpdated);
    return () => { socket.emit("leave:tournament", tournamentId); socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("match:updated", onMatchUpdated); socket.off("broadcast:updated", onMatchUpdated); socket.disconnect(); };
  }, [load, tournamentId]);

  const assignedIds = useMemo(() => new Set(stations.flatMap((station) => station.matches.map((match) => match.id))), [stations]);
  const unassigned = matches.filter((match) => !assignedIds.has(match.id));
  const visibleMatches = filter === "UNASSIGNED" ? unassigned : filter === "LIVE" ? [] : matches;
  const liveStations = stations.filter((s) => s.matches[0]?.status === "LIVE").length;
  const attentionStations = stations.filter((s) => health(s).label === "ATTENTION" || health(s).label === "ERROR").length;
  const onlineStations = stations.filter((s) => s.status !== "OFFLINE" && !s.isStale && s.status !== "ERROR").length;
  const readiness = [
    { label: "Stations registered", detail: stations.length > 0 ? `${stations.length} station${stations.length === 1 ? "" : "s"}` : "Add at least one station", ok: stations.length > 0 },
    { label: "Station health", detail: attentionStations === 0 ? "All stations healthy" : `${attentionStations} station${attentionStations === 1 ? "" : "s"} need attention`, ok: stations.length > 0 && attentionStations === 0 },
    { label: "Queued matches assigned", detail: unassigned.length === 0 ? "Queue is fully assigned" : `${unassigned.length} match${unassigned.length === 1 ? "" : "es"} unassigned`, ok: matches.length > 0 && unassigned.length === 0 },
    { label: "Operations link", detail: connection === "LIVE" ? "Realtime connected" : "Realtime reconnecting", ok: connection === "LIVE" },
  ];
  const readyToRun = readiness.every((item) => item.ok);

  function requestAssignment(match: Match, stationId: string | null) {
    if (match.status === "LIVE" || match.status === "COMPLETED") {
      setError("Live or completed matches cannot be reassigned.");
      return;
    }
    const station = stations.find((item) => item.id === stationId);
    if (stationId && (!station || station.status === "OFFLINE" || station.status === "ERROR" || station.isStale)) {
      setError("Choose a healthy, online station before assigning this match.");
      return;
    }
    if (stationId && station?.matches.some((item) => item.id !== match.id && (item.status === "QUEUED" || item.status === "LIVE"))) {
      setError("That station is already occupied by another active match.");
      return;
    }
    setPending({ match, stationId, stationLabel: station?.label ?? "UNASSIGNED", previousLabel: match.station?.label ?? "UNASSIGNED" });
  }

  async function confirmAssignment() {
    if (!pending) return;
    const { match, stationId } = pending;
    setBusy(match.id);
    setError(null);
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/station`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stationId }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Station assignment failed");
      setPending(null);
      setRunAcknowledged(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Station assignment failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap" }}>
          <div><div style={eyebrow}>FGC CONTROL ROOM 2.0</div><h1 style={{ margin: "7px 0 0", fontSize: 34, letterSpacing: "-.03em" }}>Tournament Operations</h1><p style={{ margin: "7px 0 0", color: "#8b91a3", fontSize: 13 }}>Competition state, station state and broadcast readiness in one operator surface.</p></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ ...statusPill, color: connection === "LIVE" ? "#22c55e" : "#f59e0b", borderColor: connection === "LIVE" ? "#22c55e55" : "#f59e0b55" }}>● REALTIME {connection}</span><button onClick={() => setAuditOpen((value) => !value)} style={secondaryButton}>AUDIT {audit.length}</button><a href={`/broadcast/${tournamentId}/control-room`} style={secondaryButton}>← Broadcast Studio</a></div>
        </header>

        <section style={{ ...panel, marginBottom: 18, borderColor: readyToRun ? "#166534" : "#252936" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div><div style={eyebrow}>RUN TOURNAMENT</div><h2 style={{ margin: "6px 0 0", fontSize: 22 }}>{readyToRun ? "READY TO GO LIVE" : "Readiness check"}</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: "#747b8c" }}>No production state is changed automatically. This gate verifies the operator can safely hand off to Broadcast Studio.</p></div>
            <button disabled={!readyToRun} onClick={() => setRunAcknowledged(true)} style={{ ...runButton, opacity: readyToRun ? 1 : .4, cursor: readyToRun ? "pointer" : "not-allowed" }}>{runAcknowledged ? "READY · OPEN STUDIO" : "RUN TOURNAMENT"}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>{readiness.map((item) => <div key={item.label} style={{ border: `1px solid ${item.ok ? "#14532d" : "#3a3030"}`, background: item.ok ? "#07130c" : "#100d0f", borderRadius: 11, padding: 11 }}><div style={{ fontSize: 11, fontWeight: 800, color: item.ok ? "#86efac" : "#fbbf24" }}>{item.ok ? "✓" : "!"} {item.label}</div><div style={{ marginTop: 4, fontSize: 10, color: "#707789" }}>{item.detail}</div></div>)}</div>
          {runAcknowledged && readyToRun && <a href={`/broadcast/${tournamentId}/control-room`} style={{ display: "inline-block", marginTop: 12, color: "#c4b5fd", fontSize: 12 }}>Open Broadcast Studio →</a>}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}><Metric label="STATIONS" value={String(stations.length)} detail={`${onlineStations} online`} /><Metric label="LIVE" value={String(liveStations)} detail="matches on air" /><Metric label="UNASSIGNED" value={String(unassigned.length)} detail="queued matches" /><Metric label="ATTENTION" value={String(attentionStations)} detail="needs operator review" danger={attentionStations > 0} /></section>
        {error && <div style={{ ...panel, borderColor: "#7f1d1d", color: "#fecaca", marginBottom: 14 }}>⚠ {error}</div>}

        {auditOpen && <section style={{ ...panel, marginBottom: 18, borderColor: "#3b2d5e" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div><div style={eyebrow}>OPERATOR AUDIT</div><h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Recent control-room actions</h2></div><span style={{ color: "#747b8c", fontSize: 10 }}>READ ONLY</span></div>{audit.length === 0 ? <div style={empty}>No operator events recorded yet.</div> : <div style={{ display: "grid", gap: 7 }}>{audit.map((entry) => <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "155px 1fr auto", gap: 10, alignItems: "center", padding: 10, border: "1px solid #252936", borderRadius: 10, background: "#090b10" }}><span style={{ color: "#697083", fontSize: 10 }}>{new Date(entry.createdAt).toLocaleTimeString()}</span><div><b style={{ fontSize: 11 }}>{entry.action.replaceAll("_", " ")}</b><div style={{ marginTop: 3, color: "#626a7c", fontSize: 9 }}>{entry.entityType} · {entry.entityId?.slice(0, 10) ?? "—"}</div></div><span style={{ color: "#6f7788", fontSize: 9 }}>{entry.actorUserId ? "OPERATOR" : "SYSTEM"}</span></div>)}</div>}</section>}

        <section style={{ ...panel, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}><div><div style={eyebrow}>STATION GRID</div><h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Live infrastructure</h2></div><div style={{ display: "flex", gap: 7 }}>{(["ALL", "LIVE", "UNASSIGNED"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} style={filter === item ? activeButton : filterButton}>{item}</button>)}</div></div>
          {loading ? <div style={empty}>Loading station telemetry…</div> : stations.length === 0 ? <div style={empty}>No stations are registered for this tournament.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 10 }}>{stations.map((station) => { const state = health(station); const current = station.matches[0]; const canClear = current?.status === "QUEUED"; return <article key={station.id} style={{ ...card, borderColor: state.label === "LIVE" ? "#166534" : state.label === "ATTENTION" || state.label === "ERROR" ? "#78350f" : "#252936" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong style={{ fontSize: 15 }}>{station.label}</strong><span style={{ ...statusPill, color: state.tone, borderColor: `${state.tone}55` }}>● {state.label}</span></div><div style={{ marginTop: 16, minHeight: 64 }}>{current ? <><div style={{ fontSize: 12, color: "#9ca3af" }}>{current.round ?? "MATCH"} · {current.status}</div><div style={{ marginTop: 6, fontWeight: 800 }}>{current.playerOne?.gamertag ?? "TBD"} <span style={{ color: "#6b7280" }}>{current.playerOneScore}–{current.playerTwoScore}</span> {current.playerTwo?.gamertag ?? "TBD"}</div></> : <div style={{ color: "#656b7b", fontSize: 12 }}>No match assigned</div>}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 10, color: "#777e90" }}><div>BITRATE<br /><b style={{ color: "#c9ced9" }}>{station.currentBitrateKbps ?? "—"} kbps</b></div><div>DROPPED<br /><b style={{ color: "#c9ced9" }}>{station.droppedFrames ?? "—"}</b></div></div>{canClear && <button onClick={() => { const match = matches.find((item) => item.id === current.id) ?? { id: current.id, round: current.round, status: "QUEUED", playerOneScore: current.playerOneScore, playerTwoScore: current.playerTwoScore, playerOne: current.playerOne, playerTwo: current.playerTwo, station: { id: station.id, label: station.label, status: station.status } }; requestAssignment(match, null); }} style={dangerButton}>CLEAR ASSIGNMENT</button>}</article>; })}</div>}
        </section>

        <section style={panel}><div style={{ marginBottom: 14 }}><div style={eyebrow}>MATCH QUEUE</div><h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Assignment desk</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: "#747b8c" }}>Assignments are atomic and conflict-protected. Reassignments require operator confirmation; live/completed matches stay locked.</p></div>{visibleMatches.length === 0 ? <div style={empty}>{filter === "UNASSIGNED" ? "All queued matches are assigned." : filter === "LIVE" ? "Live matches are shown on station cards above." : "No queued matches are available."}</div> : <div style={{ display: "grid", gap: 8 }}>{visibleMatches.map((match) => <div key={match.id} style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr auto", gap: 12, alignItems: "center", padding: 13, border: "1px solid #252936", borderRadius: 13, background: "#090b10" }}><div><div style={{ fontSize: 10, color: "#737a8b", letterSpacing: ".12em" }}>{match.round ?? "QUEUED"} · {match.id.slice(0, 8)}</div><div style={{ marginTop: 5, fontWeight: 800 }}>{match.playerOne?.gamertag ?? "TBD"} <span style={{ color: "#5e6575" }}>vs</span> {match.playerTwo?.gamertag ?? "TBD"}</div></div><select value={match.station?.id ?? ""} disabled={busy === match.id} onChange={(event) => requestAssignment(match, event.target.value || null)} style={select}><option value="">Unassigned</option>{stations.map((station) => { const occupied = station.matches.some((item) => item.id !== match.id && (item.status === "QUEUED" || item.status === "LIVE")); const unhealthy = station.status === "OFFLINE" || station.status === "ERROR" || station.isStale; return <option key={station.id} value={station.id} disabled={occupied || unhealthy}>{station.label}{occupied ? " · OCCUPIED" : unhealthy ? " · UNHEALTHY" : ""}</option>; })}</select><span style={{ fontSize: 10, color: busy === match.id ? "#a78bfa" : "#667085", minWidth: 72, textAlign: "right" }}>{busy === match.id ? "SYNCING…" : match.station ? "ASSIGNED" : "READY"}</span></div>)}</div>}</section>
      </div>

      {pending && <div style={modalBackdrop}><section style={modal}><div style={eyebrow}>CONFIRM STATION CHANGE</div><h2 style={{ margin: "7px 0 0", fontSize: 22 }}>Move this match?</h2><p style={{ color: "#8b91a3", fontSize: 12, lineHeight: 1.6 }}>This changes the operational station assignment and writes an audit event. The match itself will not be started or stopped.</p><div style={compare}><div><span>FROM</span><b>{pending.previousLabel}</b></div><div style={{ color: "#6d7383" }}>→</div><div><span>TO</span><b>{pending.stationLabel}</b></div></div>{pending.match.playerOneScore + pending.match.playerTwoScore > 0 && <div style={warning}>⚠ Score already exists on this match. Verify the station move is intentional.</div>}<div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button onClick={() => setPending(null)} style={filterButton}>CANCEL</button><button onClick={() => void confirmAssignment()} disabled={busy === pending.match.id} style={confirmButton}>{busy === pending.match.id ? "APPLYING…" : "CONFIRM CHANGE"}</button></div></section></div>}
    </main>
  );
}

function Metric({ label, value, detail, danger }: { label: string; value: string; detail: string; danger?: boolean }) { return <div style={panel}><div style={eyebrow}>{label}</div><div style={{ marginTop: 8, fontSize: 25, fontWeight: 850, color: danger ? "#f59e0b" : "#fff" }}>{value}</div><div style={{ marginTop: 3, fontSize: 11, color: "#666d7e" }}>{detail}</div></div>; }

const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 18, padding: 18 } as const;
const card = { background: "#090b10", border: "1px solid #252936", borderRadius: 14, padding: 15 } as const;
const eyebrow = { fontSize: 10, letterSpacing: ".15em", color: "#666d7e", fontWeight: 700 } as const;
const secondaryButton = { border: "1px solid #303543", borderRadius: 9, padding: "10px 13px", color: "#c4b5fd", textDecoration: "none", fontSize: 11, fontWeight: 700, background: "transparent", cursor: "pointer" } as const;
const runButton = { border: "1px solid #8b5cf6", borderRadius: 10, padding: "12px 17px", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 850, letterSpacing: ".08em" } as const;
const filterButton = { border: "1px solid #2b2f3c", borderRadius: 8, padding: "8px 10px", background: "#11131a", color: "#7d8495", fontSize: 10, fontWeight: 800, cursor: "pointer" } as const;
const activeButton = { ...filterButton, background: "#7c3aed", borderColor: "#8b5cf6", color: "#fff" } as const;
const statusPill = { border: "1px solid", borderRadius: 999, padding: "4px 7px", fontSize: 9, letterSpacing: ".08em", fontWeight: 800 } as const;
const select = { width: "100%", background: "#11131a", color: "#e5e7eb", border: "1px solid #303543", borderRadius: 8, padding: "9px 10px", fontSize: 12 } as const;
const empty = { padding: 28, border: "1px dashed #2a2e3a", borderRadius: 12, color: "#697083", textAlign: "center", fontSize: 12 } as const;
const dangerButton = { marginTop: 14, width: "100%", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 10px", background: "#170b0d", color: "#fca5a5", fontSize: 9, fontWeight: 850, letterSpacing: ".08em", cursor: "pointer" } as const;
const confirmButton = { ...runButton, padding: "9px 12px", cursor: "pointer" } as const;
const modalBackdrop = { position: "fixed", inset: 0, zIndex: 50, background: "#000b", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } as const;
const modal = { width: "min(520px, 100%)", background: "#0d0f16", border: "1px solid #39324d", borderRadius: 18, padding: 22, boxShadow: "0 24px 80px #000b" } as const;
const compare = { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, padding: 15, marginTop: 14, background: "#090b10", border: "1px solid #252936", borderRadius: 12 } as const;
const warning = { marginTop: 10, padding: 10, border: "1px solid #78350f", background: "#1a1108", borderRadius: 9, color: "#fbbf24", fontSize: 10, lineHeight: 1.5 } as const;
