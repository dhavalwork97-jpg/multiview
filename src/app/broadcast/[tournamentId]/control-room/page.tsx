"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  DEFAULT_MATCH_TIMELINE,
  type BroadcastCommandType,
  type BroadcastScene,
} from "@/lib/broadcast/production";

const scenes: BroadcastScene[] = [
  "starting-soon",
  "intro",
  "versus",
  "gameplay",
  "timeout",
  "replay",
  "winner",
  "champion",
  "brb",
];

const specializedCommands: Partial<Record<BroadcastScene, BroadcastCommandType>> = {
  "starting-soon": "COUNTDOWN_START",
  intro: "INTRO_PLAY",
  replay: "REPLAY_PLAY",
  winner: "WINNER_SHOW",
  brb: "BRB_SHOW",
};

export default function BroadcastControlRoom({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [program, setProgram] = useState<BroadcastScene>("starting-soon");
  const [preview, setPreview] = useState<BroadcastScene>("gameplay");
  const [status, setStatus] = useState("READY");
  const [lastCommand, setLastCommand] = useState("None");
  const [timelineRunning, setTimelineRunning] = useState(false);
  const [timelineStartedAt, setTimelineStartedAt] = useState<number | null>(null);
  const [lastTimelineCue, setLastTimelineCue] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ tournamentId: id }) => setTournamentId(id));
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || window.location.origin;
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });

    const onConnect = () => {
      socket.emit("join:tournament", tournamentId);
      setStatus("LIVE");
    };
    const onBroadcastUpdated = (event: {
      type?: string;
      tournamentId?: string;
      scene?: string;
      commandType?: string;
    }) => {
      if (event.tournamentId !== tournamentId || !scenes.includes(event.scene as BroadcastScene)) return;
      setProgram(event.scene as BroadcastScene);
      setLastCommand(`${event.commandType ?? "SCENE_SET"} · ${event.scene}`);
      setStatus("LIVE");
    };

    socket.on("connect", onConnect);
    socket.on("broadcast:updated", onBroadcastUpdated);
    socket.on("connect_error", () => setStatus("OFFLINE"));

    return () => {
      socket.emit("leave:tournament", tournamentId);
      socket.off("connect", onConnect);
      socket.off("broadcast:updated", onBroadcastUpdated);
      socket.disconnect();
    };
  }, [tournamentId]);

  const timelineCue = useMemo(() => {
    if (timelineStartedAt === null) return null;
    const elapsed = Date.now() - timelineStartedAt;
    return [...DEFAULT_MATCH_TIMELINE.cues].reverse().find((cue) => elapsed >= cue.atMs) ?? null;
  }, [timelineStartedAt]);

  useEffect(() => {
    if (!timelineRunning || timelineStartedAt === null || !tournamentId) return;

    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - timelineStartedAt;
      const cue = [...DEFAULT_MATCH_TIMELINE.cues].reverse().find((item) => elapsedMs >= item.atMs) ?? null;
      if (!cue || cue.id === lastTimelineCue) return;

      setLastTimelineCue(cue.id);
      void fetch("/api/broadcast/timeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId, elapsedMs }),
      }).then((response) => {
        if (!response.ok) setStatus("ERROR");
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [lastTimelineCue, timelineRunning, timelineStartedAt, tournamentId]);

  async function issueCommand(scene: BroadcastScene, type: BroadcastCommandType = "SCENE_SET") {
    if (!tournamentId) return false;
    setStatus("SYNCING");
    try {
      const response = await fetch("/api/broadcast/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId, type, scene }),
      });
      if (!response.ok) throw new Error("Broadcast command failed");
      setProgram(scene);
      setLastCommand(`${type} · ${scene}`);
      setStatus("LIVE");
      return true;
    } catch {
      setStatus("ERROR");
      return false;
    }
  }

  async function takePreview() {
    await issueCommand(preview, specializedCommands[preview] ?? "SCENE_SET");
  }

  function runTimeline() {
    setLastTimelineCue(null);
    setTimelineStartedAt(Date.now());
    setTimelineRunning(true);
    setStatus("SYNCING");
  }

  function stopTimeline() {
    setTimelineRunning(false);
    setTimelineStartedAt(null);
    setLastTimelineCue(null);
    setStatus("READY");
  }

  const elapsedLabel = timelineStartedAt === null ? "00:00" : formatElapsed(Date.now() - timelineStartedAt);

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".2em", opacity: .45 }}>FGC BROADCAST STUDIO</div>
            <h1 style={{ fontSize: 34, margin: "7px 0 0" }}>Production Control Room</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: status === "ERROR" ? "#ef4444" : status === "OFFLINE" ? "#f59e0b" : "#22c55e" }} />
            {status}
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr", gap: 18, marginBottom: 18 }}>
          <div style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Monitor title="PROGRAM" scene={program} live />
              <Monitor title="PREVIEW" scene={preview} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
              <button onClick={takePreview} style={button(true)}>TAKE PREVIEW</button>
              {!timelineRunning ? (
                <button onClick={runTimeline} style={button(false)}>RUN TIMELINE</button>
              ) : (
                <button onClick={stopTimeline} style={button(false)}>STOP TIMELINE</button>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, opacity: .5 }}>{timelineRunning ? `TIMELINE ${elapsedLabel}` : "TIMELINE READY"}</span>
            </div>
          </div>

          <div style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 }}>
            <div style={label}>PREVIEW SCENE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {scenes.map((scene) => (
                <button key={scene} onClick={() => setPreview(scene)} style={{ ...button(preview === scene), padding: "10px 8px", fontSize: 11 }}>
                  {scene.replace("-", " ").toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Card title="PROGRAM" value={program.toUpperCase()} />
          <Card title="PREVIEW" value={preview.toUpperCase()} />
          <Card title="LAST COMMAND" value={lastCommand} />
        </section>

        {timelineCue && timelineRunning && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #252936", background: "#0c0e14", fontSize: 11, opacity: .7 }}>
            TIMELINE CUE · {timelineCue.id.toUpperCase()}
          </div>
        )}
      </div>
    </main>
  );
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function Monitor({ title, scene, live }: { title: string; scene: BroadcastScene; live?: boolean }) {
  return (
    <div style={{ aspectRatio: "16 / 9", borderRadius: 14, background: "linear-gradient(135deg,#151822,#090a0f)", border: `1px solid ${live ? "#6d28d9" : "#252936"}`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: ".14em", opacity: .55 }}><span>{title}</span>{live && <span>ON AIR</span>}</div>
      <div><div style={{ fontSize: 28, fontWeight: 800 }}>{scene.replace("-", " ").toUpperCase()}</div><div style={{ opacity: .45, fontSize: 11, marginTop: 4 }}>FGC NATIVE BROADCAST GRAPHICS</div></div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return <div style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 14, padding: 16 }}><div style={label}>{title}</div><div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>{value}</div></div>;
}

const label = { fontSize: 10, letterSpacing: ".15em", opacity: .45 } as const;
const button = (active: boolean) => ({ border: "1px solid #2b2f3c", borderRadius: 9, padding: "11px 15px", background: active ? "#7c3aed" : "#11131a", color: "white", fontWeight: 700, cursor: "pointer" });
