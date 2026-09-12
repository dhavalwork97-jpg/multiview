"use client";

import { useEffect, useState } from "react";
import { getHudPackage } from "@/lib/hud/packages";

export default function HudOutput({ params }: { params: { tournamentId: string; packageId: string } }) {
  const pkg = getHudPackage(params.packageId);
  const [seconds, setSeconds] = useState(99);
  const [score, setScore] = useState([2, 1]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 99)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="fgc-overlay-root" style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "transparent", color: "white", fontFamily: "Inter, Arial, sans-serif", overflow: "hidden" }}>
      <style>{`@keyframes fgcHudIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}} @keyframes fgcPulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
      <div style={{ position: "absolute", top: 30, left: 50, right: 50, display: "flex", justifyContent: "center", animation: "fgcHudIn .45s ease-out" }}>
        <div style={{ minWidth: 760, display: "grid", gridTemplateColumns: "1fr 110px 1fr", alignItems: "stretch", background: "rgba(7,9,13,.92)", border: `1px solid ${pkg.accent}66`, boxShadow: `0 8px 40px ${pkg.accent}18`, clipPath: "polygon(0 0, 98% 0, 100% 100%, 2% 100%)" }}>
          <div style={{ padding: "12px 24px", borderLeft: `6px solid ${pkg.accent}`, textAlign: "left" }}><div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8f98a5", fontWeight: 800 }}>P1 · PLAYER ONE</div><div style={{ fontSize: 21, fontWeight: 950, marginTop: 3 }}>NIGHTMARE</div><div style={{ fontSize: 10, color: "#6f7885" }}>FGC / INDIA</div></div>
          <div style={{ borderLeft: "1px solid #29303a", borderRight: "1px solid #29303a", textAlign: "center", paddingTop: 8 }}><div style={{ fontSize: 9, letterSpacing: ".16em", color: "#737d8b" }}>ROUND 3</div><div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 950, lineHeight: 1.1 }}>{String(seconds).padStart(2, "0")}</div><div style={{ fontSize: 8, color: pkg.accent, fontWeight: 900 }}>LIVE</div></div>
          <div style={{ padding: "12px 24px", borderRight: `6px solid ${pkg.accent2}`, textAlign: "right" }}><div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8f98a5", fontWeight: 800 }}>P2 · PLAYER TWO</div><div style={{ fontSize: 21, fontWeight: 950, marginTop: 3 }}>RIVAL</div><div style={{ fontSize: 10, color: "#6f7885" }}>FGC / INDIA</div></div>
          <div style={{ gridColumn: "1 / 2", margin: "-1px 0 0 20px", width: 170, display: "flex", background: pkg.accent, clipPath: "polygon(0 0,100% 0,92% 100%,0 100%)" }}><button onClick={() => setScore(([a,b]) => [Math.min(9,a+1),b])} style={{ all: "unset", width: "50%", padding: "5px 10px", fontFamily: "monospace", fontSize: 18, fontWeight: 950 }}> {score[0]}</button><div style={{ width: 1, background: "#ffffff66" }} /><button onClick={() => setScore(([a,b]) => [a,Math.min(9,b+1)])} style={{ all: "unset", width: "50%", padding: "5px 10px", fontFamily: "monospace", fontSize: 18, fontWeight: 950, textAlign: "right" }}>{score[1]} </button></div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 34, left: 48, padding: "7px 13px", borderLeft: `3px solid ${pkg.accent}`, background: "rgba(7,9,13,.82)", fontSize: 10, letterSpacing: ".12em", fontWeight: 850 }}>TOURNAMENT LIVE · {pkg.name.toUpperCase()}</div>
      <div style={{ position: "absolute", bottom: 34, right: 48, padding: "7px 13px", background: "rgba(7,9,13,.82)", border: "1px solid #29303a", fontSize: 9, color: "#9ca3af", letterSpacing: ".1em" }}>FGC.TV · {params.tournamentId.slice(0, 8).toUpperCase()}</div>
    </div>
  );
}
