"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  round: string | null;
  status: "QUEUED" | "LIVE" | "COMPLETED" | "DISPUTED";
  playerOne: { gamertag: string } | null;
  playerTwo: { gamertag: string } | null;
  station: { id: string; label: string; status: string } | null;
};

type Station = {
  id: string;
  label: string;
  status: string;
  isStale: boolean;
  matches: Array<{ id: string; status: string; playerOne: { gamertag: string } | null; playerTwo: { gamertag: string } | null }>;
};

export default function StationAssignmentBoard({ tournamentId }: { tournamentId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [draggedMatch, setDraggedMatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [matchesResponse, stationsResponse] = await Promise.all([
      fetch(`/api/matches?tournamentId=${encodeURIComponent(tournamentId)}&status=QUEUED`, { cache: "no-store" }),
      fetch(`/api/stations?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
    ]);
    if (!matchesResponse.ok || !stationsResponse.ok) throw new Error("Unable to refresh assignment board");
    const matchPayload = (await matchesResponse.json()) as { matches: Match[] };
    const stationPayload = (await stationsResponse.json()) as { stations: Station[] };
    setMatches(matchPayload.matches ?? []);
    setStations(stationPayload.stations ?? []);
  }, [tournamentId]);

  useEffect(() => {
    void load().catch(() => setMessage("Assignment board could not refresh."));
    const timer = window.setInterval(() => void load().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const availableStations = useMemo(
    () => stations.filter((station) => station.status !== "OFFLINE" && station.status !== "ERROR" && !station.isStale && station.matches.length === 0),
    [stations],
  );

  const assign = useCallback(async (matchId: string, stationId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/station`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      if (!response.ok) throw new Error("Assignment was rejected");
      setSelected((current) => current.filter((id) => id !== matchId));
      await load();
      setMessage("Station assignment updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment failed.");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const assignSelected = useCallback(async () => {
    if (!selected.length || !availableStations.length) return;
    setBusy(true);
    setMessage(null);
    let assigned = 0;
    try {
      for (const [index, matchId] of selected.slice(0, availableStations.length).entries()) {
        const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/station`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId: availableStations[index].id }),
        });
        if (response.ok) assigned += 1;
      }
      setSelected([]);
      await load();
      setMessage(`${assigned} match${assigned === 1 ? "" : "es"} assigned.`);
    } finally {
      setBusy(false);
    }
  }, [availableStations, load, selected]);

  const toggleSelected = (matchId: string) => {
    setSelected((current) => current.includes(matchId) ? current.filter((id) => id !== matchId) : [...current, matchId]);
  };

  return (
    <section className="v34-panel" style={{ marginBottom: 18 }} aria-label="Station assignment board">
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Station Assignment Board</div>
          <div style={{ fontSize: 12, opacity: 0.62, marginTop: 3 }}>Drag queued matches onto a healthy station, or bulk-assign the selected queue.</div>
        </div>
        <button type="button" className="v34-button" disabled={busy || !selected.length || !availableStations.length} onClick={() => void assignSelected()}>
          Assign selected ({selected.length})
        </button>
      </div>

      {message && <div role="status" style={{ marginBottom: 12, fontSize: 12, opacity: 0.8 }}>{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(320px, 1.4fr)", gap: 14 }}>
        <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, minHeight: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>
            <span>WAITING</span><span style={{ opacity: 0.55 }}>{matches.length}</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {matches.map((match) => (
              <div key={match.id} draggable onDragStart={() => setDraggedMatch(match.id)} onDragEnd={() => setDraggedMatch(null)} style={{ display: "flex", alignItems: "center", gap: 9, padding: 10, borderRadius: 10, background: selected.includes(match.id) ? "rgba(96,165,250,.12)" : "rgba(255,255,255,.035)", cursor: "grab" }}>
                <input aria-label={`Select ${match.id}`} type="checkbox" checked={selected.includes(match.id)} onChange={() => toggleSelected(match.id)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{match.playerOne?.gamertag ?? "TBD"} <span style={{ opacity: .45 }}>vs</span> {match.playerTwo?.gamertag ?? "TBD"}</div>
                  <div style={{ fontSize: 10, opacity: .55, marginTop: 2 }}>{match.round ?? "Queue"}</div>
                </div>
              </div>
            ))}
            {!matches.length && <div style={{ fontSize: 12, opacity: .5, padding: 14 }}>No queued matches.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignContent: "start" }}>
          {stations.map((station) => {
            const healthy = station.status !== "OFFLINE" && station.status !== "ERROR" && !station.isStale;
            const occupied = station.matches.length > 0;
            return (
              <div key={station.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedMatch && healthy && !occupied) void assign(draggedMatch, station.id); }} style={{ minHeight: 112, padding: 12, borderRadius: 12, border: `1px solid ${healthy && !occupied ? "rgba(96,165,250,.28)" : "rgba(255,255,255,.08)"}`, background: "rgba(255,255,255,.025)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 12 }}>{station.label}</strong>
                  <span style={{ fontSize: 9, opacity: .7 }}>{healthy ? (occupied ? "BUSY" : "READY") : "ATTENTION"}</span>
                </div>
                <div style={{ fontSize: 10, opacity: .55, marginTop: 10 }}>{occupied ? `${station.matches.length} active match` : "Drop match here"}</div>
                {occupied && <div style={{ fontSize: 11, marginTop: 5 }}>{station.matches[0]?.playerOne?.gamertag ?? "TBD"} vs {station.matches[0]?.playerTwo?.gamertag ?? "TBD"}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
