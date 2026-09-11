"use client";

import { useMemo, useState } from "react";
import type { BroadcastCommandType, BroadcastScene } from "@/lib/broadcast/production";

const SCENES: Array<{ scene: BroadcastScene; label: string; type: BroadcastCommandType }> = [
  { scene: "starting-soon", label: "Starting Soon", type: "COUNTDOWN_START" },
  { scene: "intro", label: "Match Intro", type: "INTRO_PLAY" },
  { scene: "versus", label: "VS Screen", type: "SCENE_SET" },
  { scene: "gameplay", label: "Gameplay", type: "SCENE_SET" },
  { scene: "timeout", label: "Timeout", type: "SCENE_SET" },
  { scene: "replay", label: "Replay", type: "REPLAY_PLAY" },
  { scene: "winner", label: "Winner", type: "WINNER_SHOW" },
  { scene: "champion", label: "Champion", type: "WINNER_SHOW" },
  { scene: "brb", label: "BRB", type: "BRB_SHOW" },
];

type BroadcastPageProps = { params: Promise<{ tournamentId: string }> };

export default function BroadcastProductionConsole({ params }: BroadcastPageProps) {
  const [active, setActive] = useState<BroadcastScene>("gameplay");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  useMemo(() => {
    void params.then(({ tournamentId: id }) => setTournamentId(id));
  }, [params]);

  const groups = useMemo(() => [SCENES.slice(0, 4), SCENES.slice(4)], []);

  async function send(scene: BroadcastScene, type: BroadcastCommandType) {
    if (!tournamentId) return;
    setBusy(true);
    setMessage(`Sending ${scene}…`);
    try {
      const response = await fetch("/api/broadcast/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId, scene, type }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Command failed");
      setActive(scene);
      setMessage(`Program: ${scene}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Command failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", opacity: .55 }}>FGC Broadcast Studio</div>
            <h1 style={{ margin: "8px 0 0", fontSize: 36, lineHeight: 1 }}>Production Console</h1>
          </div>
          <div style={{ padding: "10px 14px", border: "1px solid #252936", borderRadius: 999, fontSize: 13, background: "#0d0f16" }}>
            ● LIVE · {message}
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 18 }}>
          <div style={{ border: "1px solid #222631", borderRadius: 20, background: "linear-gradient(145deg,#10131b,#090a10)", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 13, opacity: .55 }}>PROGRAM</span>
              <strong style={{ color: "#9f7aea" }}>{active.toUpperCase()}</strong>
            </div>
            <div style={{ aspectRatio: "16/9", borderRadius: 14, border: "1px solid #292d39", display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 40%,#24183b 0,#0b0c12 55%)", overflow: "hidden" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, letterSpacing: ".2em", opacity: .45 }}>FGC LIVE</div>
                <div style={{ fontSize: 52, fontWeight: 800, textTransform: "uppercase", marginTop: 8 }}>{active.replaceAll("-", " ")}</div>
                <div style={{ marginTop: 12, opacity: .5, fontSize: 13 }}>OBS Browser Source · Realtime</div>
              </div>
            </div>
          </div>

          <aside style={{ display: "grid", gap: 12 }}>
            {groups.map((group, index) => (
              <div key={index} style={{ border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 14, display: "grid", gap: 10 }}>
                {group.map((item) => (
                  <button key={item.scene} disabled={busy || !tournamentId} onClick={() => send(item.scene, item.type)} style={{ textAlign: "left", border: active === item.scene ? "1px solid #8b5cf6" : "1px solid #242936", borderRadius: 12, padding: "13px 14px", background: active === item.scene ? "#171127" : "#101219", color: "#fff", cursor: busy ? "wait" : "pointer" }}>
                    <div style={{ fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: 11, opacity: .45, marginTop: 3 }}>{item.type}</div>
                  </button>
                ))}
              </div>
            ))}
          </aside>
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {["Program", "Preview", "OBS Sync"].map((label, i) => (
            <div key={label} style={{ border: "1px solid #222631", borderRadius: 16, background: "#0c0e14", padding: 16 }}>
              <div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>{label}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 750 }}>{i === 0 ? active : i === 1 ? "Standby" : "Connected"}</div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}