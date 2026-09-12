"use client";

import { useCallback, useEffect, useState } from "react";
import { getHudPackage } from "@/lib/hud/packages";

type HudState = {
  scene: string;
  stationId: string | null;
  match: {
    id: string;
    status: string;
    playerOne: string;
    playerTwo: string;
    playerOneCountry: string | null;
    playerTwoCountry: string | null;
    playerOneScore: number;
    playerTwoScore: number;
    winnerId: string | null;
    game: string;
    tournament: string;
    bestOf: number;
  } | null;
};

type HudOutputClientProps = {
  tournamentId: string;
  packageId: string;
};

export default function HudOutputClient({ tournamentId, packageId }: HudOutputClientProps) {
  const pkg = getHudPackage(packageId);
  const [state, setState] = useState<HudState>({ scene: "OFFLINE", stationId: null, match: null });
  const [seconds, setSeconds] = useState(99);
  const station = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("station") : null;

  const load = useCallback(async () => {
    try {
      const query = station ? `?station=${encodeURIComponent(station)}` : "";
      const response = await fetch(`/api/hud/${encodeURIComponent(tournamentId)}${query}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as HudState;
      setState(next);
    } catch {
      // OBS Browser Sources should keep rendering the last known good frame.
    }
  }, [tournamentId, station]);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 99)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!pkg) return null;
  const match = state.match;
  const isLive = match?.status === "LIVE";
  const p1Score = match?.playerOneScore ?? 0;
  const p2Score = match?.playerTwoScore ?? 0;
  const label = isLive ? "LIVE" : match?.status ?? "WAITING";

  return (
    <div className="fgc-overlay-root" style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "transparent", color: "white", fontFamily: "Inter, Arial, sans-serif", overflow: "hidden" }}>
      <style>{`@keyframes fgcHudIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}} @keyframes fgcPulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
      <div style={{ position: "absolute", top: 30, left: 50, right: 50, display: "flex", justifyContent: "center", animation: "fgcHudIn .45s ease-out" }}>
        <div style={{ minWidth: 760, display: "grid", gridTemplateColumns: "1fr 110px 1fr", alignItems: "stretch", background: "rgba(7,9,13,.92)", border: `1px solid ${pkg.accent}66`, boxShadow: `0 8px 40px ${pkg.accent}18`, clipPath: "polygon(0 0, 98% 0, 100% 100%, 2% 100%)" }}>
          <div style={{ padding: "12px 24px", borderLeft: `6px solid ${pkg.accent}`, textAlign: "left" }}><div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8f98a5", fontWeight: 800 }}>P1 · PLAYER ONE</div><div style={{ fontSize: 21, fontWeight: 950, marginTop: 3 }}>{match?.playerOne ?? "PLAYER 1"}</div><div style={{ fontSize: 10, color: "#6f7885" }}>{match?.playerOneCountry ?? "—"}</div></div>
          <div style={{ borderLeft: "1px solid #29303a", borderRight: "1px solid #29303a", textAlign: "center", paddingTop: 8 }}><div style={{ fontSize: 9, letterSpacing: ".16em", color: "#737d8b" }}>BO{match?.bestOf ?? 3}</div><div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 950, lineHeight: 1.1 }}>{String(seconds).padStart(2, "0")}</div><div style={{ fontSize: 8, color: pkg.accent, fontWeight: 900, animation: isLive ? "fgcPulse 1.4s infinite" : undefined }}>{label}</div></div>
          <div style={{ padding: "12px 24px", borderRight: `6px solid ${pkg.accent2}`, textAlign: "right" }}><div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8f98a5", fontWeight: 800 }}>P2 · PLAYER TWO</div><div style={{ fontSize: 21, fontWeight: 950, marginTop: 3 }}>{match?.playerTwo ?? "PLAYER 2"}</div><div style={{ fontSize: 10, color: "#6f7885" }}>{match?.playerTwoCountry ?? "—"}</div></div>
          <div style={{ gridColumn: "1 / 4", display: "flex", justifyContent: "center", marginTop: -1 }}><div style={{ minWidth: 230, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "5px 14px", background: pkg.accent, clipPath: "polygon(0 0,100% 0,94% 100%,6% 100%)" }}><span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 950, textAlign: "center" }}>{p1Score}</span><span style={{ fontSize: 8, opacity: .7, letterSpacing: ".15em" }}>SCORE</span><span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 950, textAlign: "center" }}>{p2Score}</span></div></div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 34, left: 48, padding: "7px 13px", borderLeft: `3px solid ${pkg.accent}`, background: "rgba(7,9,13,.82)", fontSize: 10, letterSpacing: ".12em", fontWeight: 850 }}>{match?.tournament?.toUpperCase() ?? "TOURNAMENT"} · {pkg.name.toUpperCase()}</div>
      <div style={{ position: "absolute", bottom: 34, right: 48, padding: "7px 13px", background: "rgba(7,9,13,.82)", border: "1px solid #29303a", fontSize: 9, color: "#9ca3af", letterSpacing: ".1em" }}>{match?.game?.toUpperCase() ?? "FGC"} · {tournamentId.slice(0, 8).toUpperCase()}</div>
    </div>
  );
}
