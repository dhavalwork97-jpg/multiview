"use client";

import { useEffect, useState } from "react";
import type { BroadcastScene } from "@/lib/broadcast/production";

const scenes: BroadcastScene[] = ["starting-soon", "intro", "versus", "gameplay", "timeout", "replay", "winner", "champion", "brb"];

export default function BroadcastControlRoom({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [program, setProgram] = useState<BroadcastScene>("starting-soon");
  const [preview, setPreview] = useState<BroadcastScene>("gameplay");
  const [status, setStatus] = useState("READY");
  const [lastCommand, setLastCommand] = useState("None");

  useEffect(() => { void params.then(({ tournamentId: id }) => setTournamentId(id)); }, [params]);

  async function setScene(scene: BroadcastScene) {
    if (!tournamentId) return;
    setStatus("SYNCING");
    const response = await fetch("/api/broadcast/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, type: "SCENE_SET", scene }) });
    if (response.ok) { setProgram(scene); setLastCommand(`SCENE_SET · ${scene}`); setStatus("LIVE"); } else setStatus("ERROR");
  }

  async function runTimeline() {
    if (!tournamentId) return;
    setStatus("SYNCING");
    const response = await fetch("/api/broadcast/timeline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, elapsedMs: 0 }) });
    if (response.ok) { setLastCommand("TIMELINE · STARTING SOON"); setStatus("LIVE"); } else setStatus("ERROR");
  }

  return <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}><div style={{ maxWidth: 1280, margin: "0 auto" }}><header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><div><div style={{ fontSize: 11, letterSpacing: ".2em", opacity: .45 }}>FGC BROADCAST STUDIO</div><h1 style={{ fontSize: 34, margin: "7px 0 0" }}>Production Control Room</h1></div><div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: status === "ERROR" ? "#ef4444" : "#22c55e" }} />{status}</div></header><section style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr", gap: 18, marginBottom: 18 }}><div style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Monitor title="PROGRAM" scene={program} live /><Monitor title="PREVIEW" scene={preview} /></div><div style={{ display: "flex", gap: 10, marginTop: 14 }}><button onClick={() => setScene(preview)} style={button(true)}>TAKE PREVIEW</button><button onClick={runTimeline} style={button(false)}>RUN TIMELINE</button></div></div><div style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 }}><div style={label}>PROGRAM SCENE</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>{scenes.map((scene) => <button key={scene} onClick={() => setScene(scene)} style={{ ...button(program === scene), padding: "10px 8px", fontSize: 11 }}>{scene.replace("-", " ").toUpperCase()}</button>)}</div></div></section><section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}><Card title="PROGRAM" value={program.toUpperCase()} /><Card title="PREVIEW" value={preview.toUpperCase()} /><Card title="LAST COMMAND" value={lastCommand} /></section></div></main>;
}

function Monitor({ title, scene, live }: { title: string; scene: BroadcastScene; live?: boolean }) { return <div style={{ aspectRatio: "16 / 9", borderRadius: 14, background: "linear-gradient(135deg,#151822,#090a0f)", border: `1px solid ${live ? "#6d28d9" : "#252936"}`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: ".14em", opacity: .55 }}><span>{title}</span>{live && <span>ON AIR</span>}</div><div><div style={{ fontSize: 28, fontWeight: 800 }}>{scene.replace("-", " ").toUpperCase()}</div><div style={{ opacity: .45, fontSize: 11, marginTop: 4 }}>FGC NATIVE BROADCAST GRAPHICS</div></div></div> }
function Card({ title, value }: { title: string; value: string }) { return <div style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 14, padding: 16 }}><div style={label}>{title}</div><div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>{value}</div></div> }
const label = { fontSize: 10, letterSpacing: ".15em", opacity: .45 } as const;
const button = (active: boolean) => ({ border: "1px solid #2b2f3c", borderRadius: 9, padding: "11px 15px", background: active ? "#7c3aed" : "#11131a", color: "white", fontWeight: 700, cursor: "pointer" });
