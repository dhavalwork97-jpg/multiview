"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  round: string | null;
  status: "QUEUED" | "LIVE" | "COMPLETED" | "DISPUTED";
  playerOneScore: number;
  playerTwoScore: number;
  playerOne: { gamertag: string } | null;
  playerTwo: { gamertag: string } | null;
  station: { id: string; label: string; status: string } | null;
};

type Station = { id: string; label: string; status: string; isStale: boolean; matches: Array<{ id: string; status: string }> };

const tone: Record<string, { bg: string; border: string; text: string }> = {
  LIVE: { bg: "#07130c", border: "#166534", text: "#86efac" },
  NEXT: { bg: "#0c0d17", border: "#4338ca", text: "#c4b5fd" },
  READY: { bg: "#0b1118", border: "#164e63", text: "#67e8f9" },
  ATTENTION: { bg: "#171108", border: "#78350f", text: "#fbbf24" },
  COMPLETE: { bg: "#0b0d12", border: "#252936", text: "#7d8495" },
};

export default function RundownClient({ tournamentId }: { tournamentId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [queuedRes, liveRes, stationRes] = await Promise.all([
        fetch(`/api/matches?tournamentId=${encodeURIComponent(tournamentId)}&status=QUEUED`, { cache: "no-store" }),
        fetch(`/api/matches?tournamentId=${encodeURIComponent(tournamentId)}&status=LIVE`, { cache: "no-store" }),
        fetch(`/api/stations?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
      ]);
      if (!queuedRes.ok || !liveRes.ok || !stationRes.ok) throw new Error("Unable to load rundown data");
      const queued = (await queuedRes.json()) as { matches: Match[] };
      const live = (await liveRes.json()) as { matches: Match[] };
      const stationPayload = (await stationRes.json()) as { stations: Station[] };
      setMatches([...(live.matches ?? []), ...(queued.matches ?? [])]);
      setStations(stationPayload.stations ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load rundown");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const live = useMemo(() => matches.filter((m) => m.status === "LIVE"), [matches]);
  const queued = useMemo(() => matches.filter((m) => m.status === "QUEUED"), [matches]);
  const assigned = useMemo(() => queued.filter((m) => m.station), [queued]);
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const attention = stations.filter((s) => s.status === "OFFLINE" || s.status === "ERROR" || s.isStale).length;

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1450, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <div style={eyebrow}>FGC CONTROL ROOM 2.0 · RUNDOWN</div>
            <h1 style={{ margin: "7px 0 0", fontSize: 34, letterSpacing: "-.03em" }}>Broadcast Rundown</h1>
            <p style={{ margin: "7px 0 0", color: "#8b91a3", fontSize: 13 }}>A live operator timeline for what is on air, what is next, and what needs attention.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={`/broadcast/${tournamentId}/control-room/operations`} style={button}>← Operations</a>
            <a href={`/broadcast/${tournamentId}/control-room`} style={button}>Broadcast Studio</a>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <Metric label="ON AIR" value={String(live.length)} detail="live matches" />
          <Metric label="NEXT" value={String(queued.length ? 1 : 0)} detail={queued[0]?.round ?? "queue empty"} />
          <Metric label="READY" value={String(assigned.length)} detail="queued matches assigned" />
          <Metric label="ATTENTION" value={String(attention)} detail="station issues" danger={attention > 0} />
        </section>

        {error && <div style={{ ...panel, borderColor: "#7f1d1d", color: "#fecaca", marginBottom: 14 }}>⚠ {error}</div>}

        <section style={panel}>
          <div style={{ display: "grid", gridTemplateColumns: "90px minmax(260px, 1.6fr) 140px 150px 150px 120px", gap: 10, padding: "0 12px 10px", color: "#5f6677", fontSize: 9, fontWeight: 800, letterSpacing: ".14em" }}>
            <span>ORDER</span><span>PROGRAM</span><span>STATION</span><span>PLANNED</span><span>ACTUAL</span><span>STATE</span>
          </div>
          {loading ? <div style={empty}>Loading live rundown…</div> : matches.length === 0 ? <div style={empty}>No live or queued matches are available for this tournament.</div> : (
            <div style={{ display: "grid", gap: 7 }}>
              {matches.map((match, index) => {
                const state = match.status === "LIVE" ? "LIVE" : index === live.length ? "NEXT" : match.station ? "READY" : "ATTENTION";
                const c = tone[state];
                const station = match.station ? stationById.get(match.station.id) : null;
                const unhealthy = station && (station.status === "OFFLINE" || station.status === "ERROR" || station.isStale);
                const stateLabel = unhealthy ? "ATTENTION" : state;
                return <div key={match.id} style={{ display: "grid", gridTemplateColumns: "90px minmax(260px, 1.6fr) 140px 150px 150px 120px", gap: 10, alignItems: "center", padding: 13, border: `1px solid ${unhealthy ? tone.ATTENTION.border : c.border}`, borderRadius: 12, background: unhealthy ? tone.ATTENTION.bg : c.bg }}>
                  <div><b style={{ fontSize: 15 }}>#{String(index + 1).padStart(2, "0")}</b><div style={{ color: "#687082", fontSize: 9, marginTop: 3 }}>{match.round ?? "MATCH"}</div></div>
                  <div><div style={{ fontWeight: 800, fontSize: 13 }}>{match.playerOne?.gamertag ?? "TBD"} <span style={{ color: "#555d6e", margin: "0 5px" }}>vs</span> {match.playerTwo?.gamertag ?? "TBD"}</div><div style={{ color: "#6d7485", fontSize: 10, marginTop: 4 }}>Score {match.playerOneScore}–{match.playerTwoScore} · {match.id.slice(0, 10)}</div></div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{match.station?.label ?? "UNASSIGNED"}</div>
                  <div style={muted}>—<br /><small>schedule not configured</small></div>
                  <div style={muted}>{match.status === "LIVE" ? "LIVE NOW" : "—"}<br /><small>{match.status === "LIVE" ? "production state" : "awaiting start"}</small></div>
                  <span style={{ ...pill, color: unhealthy ? tone.ATTENTION.text : c.text, borderColor: `${unhealthy ? tone.ATTENTION.border : c.border}99` }}>● {stateLabel}</span>
                </div>;
              })}
            </div>
          )}
        </section>

        <section style={{ ...panel, marginTop: 14 }}>
          <div style={eyebrow}>OPERATOR NOTE</div>
          <p style={{ margin: "8px 0 0", color: "#818899", fontSize: 11, lineHeight: 1.6 }}>Planned and actual timestamps intentionally remain empty until tournament scheduling data is configured. This rundown does not invent timing; it reflects live competition and station state only.</p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail, danger }: { label: string; value: string; detail: string; danger?: boolean }) { return <div style={panel}><div style={eyebrow}>{label}</div><div style={{ marginTop: 8, fontSize: 25, fontWeight: 850, color: danger ? "#f59e0b" : "#fff" }}>{value}</div><div style={{ marginTop: 3, fontSize: 11, color: "#666d7e" }}>{detail}</div></div>; }

const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 18, padding: 18 } as const;
const eyebrow = { fontSize: 10, letterSpacing: ".15em", color: "#666d7e", fontWeight: 700 } as const;
const button = { border: "1px solid #303543", borderRadius: 9, padding: "10px 13px", color: "#c4b5fd", textDecoration: "none", fontSize: 11, fontWeight: 700 } as const;
const pill = { border: "1px solid", borderRadius: 999, padding: "5px 8px", fontSize: 9, letterSpacing: ".08em", fontWeight: 800, textAlign: "center" } as const;
const muted = { color: "#697083", fontSize: 10, lineHeight: 1.5 } as const;
const empty = { padding: 28, border: "1px dashed #2a2e3a", borderRadius: 12, color: "#697083", textAlign: "center", fontSize: 12 } as const;
