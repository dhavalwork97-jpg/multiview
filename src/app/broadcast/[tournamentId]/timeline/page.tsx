"use client";

import { useEffect, useRef, useState } from "react";

const CUES = [
  ["00:00", "Starting Soon", "COUNTDOWN_START"],
  ["00:05", "Match Intro", "INTRO_PLAY"],
  ["00:12", "VS Screen", "SCENE_SET"],
  ["00:18.5", "Gameplay", "SCENE_SET"],
] as const;

type Props = { params: Promise<{ tournamentId: string }> };

export default function BroadcastTimelineOperator({ params }: Props) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [program, setProgram] = useState("starting-soon");
  const [message, setMessage] = useState("Ready");
  const startedAt = useRef<number | null>(null);
  const lastCue = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void params.then(({ tournamentId: id }) => mounted && setTournamentId(id));
    return () => { mounted = false; };
  }, [params]);

  useEffect(() => {
    if (!running || !tournamentId) return;
    const timer = window.setInterval(async () => {
      const start = startedAt.current ?? Date.now();
      startedAt.current = start;
      const elapsed = Date.now() - start;
      setElapsedMs(elapsed);

      const response = await fetch("/api/broadcast/timeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId, elapsedMs: elapsed }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.cue || data.cue.id === lastCue.current) return;
      lastCue.current = data.cue.id;
      setProgram(data.command.scene);
      setMessage(`Auto: ${data.command.scene} · OBS ${data.obsScene}`);
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, tournamentId]);

  function toggle() {
    if (running) {
      setRunning(false);
      setMessage("Timeline paused");
      return;
    }
    startedAt.current = Date.now() - elapsedMs;
    lastCue.current = null;
    setRunning(true);
    setMessage("Timeline running");
  }

  function reset() {
    setRunning(false);
    startedAt.current = null;
    lastCue.current = null;
    setElapsedMs(0);
    setProgram("starting-soon");
    setMessage("Timeline reset");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: ".18em", opacity: .5, textTransform: "uppercase" }}>FGC Broadcast Studio</div>
        <h1 style={{ fontSize: 38, margin: "8px 0 24px" }}>Production Timeline</h1>
        <section style={{ border: "1px solid #252936", borderRadius: 20, background: "#0c0e14", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div><div style={{ opacity: .45, fontSize: 12 }}>PROGRAM</div><div style={{ fontSize: 30, fontWeight: 800, textTransform: "uppercase", marginTop: 5 }}>{program.replaceAll("-", " ")}</div></div>
            <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 28 }}>{(elapsedMs / 1000).toFixed(1)}s</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button onClick={toggle} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#8b5cf6", color: "white", fontWeight: 700 }}>{running ? "Pause Timeline" : "Run Timeline"}</button>
            <button onClick={reset} style={{ border: "1px solid #292d39", borderRadius: 10, padding: "12px 18px", background: "#11131a", color: "white" }}>Reset</button>
          </div>
          <div style={{ marginTop: 14, opacity: .55, fontSize: 13 }}>{message}</div>
        </section>
        <section style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {CUES.map(([time, label, type]) => <div key={time} style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", gap: 12, alignItems: "center", border: "1px solid #222631", borderRadius: 12, padding: 14, background: "#0c0e14" }}><strong>{time}</strong><span>{label}</span><small style={{ opacity: .45 }}>{type}</small></div>)}
        </section>
      </div>
    </main>
  );
}
