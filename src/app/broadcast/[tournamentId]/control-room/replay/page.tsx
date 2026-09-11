"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveReplay, type ReplayClip } from "@/lib/broadcast/replay-manager";
import { normalizeReplayBumper, normalizeReplayClip, type ReplayBumper } from "@/lib/broadcast/replay";

const storageKey = (id: string) => `fgc-broadcast-replays:${id}`;
const defaultClips: ReplayClip[] = [];

export default function ReplayManager({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [clips, setClips] = useState<ReplayClip[]>(defaultClips);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [bumper, setBumper] = useState<ReplayBumper>(normalizeReplayBumper(null));
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [durationMs, setDurationMs] = useState(10000);
  const [matchId, setMatchId] = useState("");
  const [stationId, setStationId] = useState("");
  const [commandStatus, setCommandStatus] = useState("READY");

  useEffect(() => {
    void params.then(({ tournamentId: id }) => {
      setTournamentId(id);
      try {
        const raw = window.localStorage.getItem(storageKey(id));
        if (!raw) return;
        const value = JSON.parse(raw) as { clips?: Partial<ReplayClip>[]; bumper?: Partial<ReplayBumper> };
        const loaded = (value.clips ?? []).map((item, index) => normalizeReplayClip(item, index));
        setClips(loaded);
        setSelectedId(loaded[0]?.id ?? null);
        setBumper(normalizeReplayBumper(value.bumper));
      } catch {
        // Keep safe defaults.
      }
    });
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;
    window.localStorage.setItem(storageKey(tournamentId), JSON.stringify({ clips, bumper }));
  }, [tournamentId, clips, bumper]);

  useEffect(() => {
    const timer = window.setInterval(() => setPreviewElapsed((value) => value + 250), 250);
    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(() => clips.find((clip) => clip.id === selectedId) ?? null, [clips, selectedId]);
  const preview = useMemo(() => clips.find((clip) => clip.id === previewId) ?? null, [clips, previewId]);
  const previewProgress = preview ? Math.min(1, previewElapsed / Math.max(1, preview.durationMs)) : 0;
  const activeReplay = getActiveReplay(clips, selectedId);

  function addClip() {
    const clip = normalizeReplayClip({ title, sourceUrl, thumbnailUrl, durationMs, matchId, stationId }, clips.length);
    setClips((items) => [...items, clip]);
    setSelectedId(clip.id);
    setTitle(""); setSourceUrl(""); setThumbnailUrl(""); setDurationMs(10000); setMatchId(""); setStationId("");
  }

  function updateClip(id: string, patch: Partial<ReplayClip>) {
    setClips((items) => items.map((item) => item.id === id ? normalizeReplayClip({ ...item, ...patch }) : item));
  }

  function removeClip(id: string) {
    setClips((items) => items.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (previewId === id) setPreviewId(null);
  }

  async function playReplay() {
    if (!tournamentId || !selected) return;
    setCommandStatus("SENDING");
    try {
      const response = await fetch("/api/broadcast/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, type: "REPLAY_PLAY", scene: "replay", matchId: selected.matchId, stationId: selected.stationId, overlay: { replayClip: selected, replayBumper: bumper } }) });
      if (!response.ok) throw new Error("Replay command failed");
      setCommandStatus("REPLAY ON AIR");
    } catch {
      setCommandStatus("ERROR");
    }
  }

  async function endReplay() {
    if (!tournamentId) return;
    setCommandStatus("SENDING");
    try {
      const response = await fetch("/api/broadcast/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, type: "SCENE_SET", scene: "gameplay" }) });
      if (!response.ok) throw new Error("Return command failed");
      setCommandStatus("GAMEPLAY PREVIEWED");
    } catch {
      setCommandStatus("ERROR");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, marginBottom: 24 }}>
          <div><div style={eyebrow}>FGC BROADCAST STUDIO</div><h1 style={title}>Replay Production</h1><p style={muted}>Prepare clips, preview the bumper, and manually send replay graphics to Program.</p></div>
          <a href={`/broadcast/${tournamentId}/control-room`} style={link}>← CONTROL ROOM</a>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 18 }}>
          <div style={panel}>
            <div style={rowHeader}><div><div style={eyebrow}>REPLAY LIBRARY</div><h2 style={sectionTitle}>Operator clips</h2></div><span style={status}>{commandStatus}</span></div>
            <div style={{ display: "grid", gap: 9, marginTop: 15 }}>
              {clips.map((clip) => <div key={clip.id} style={{ ...item, borderColor: selectedId === clip.id ? "#7c3aed" : "#252936" }}>
                <button onClick={() => setSelectedId(clip.id)} style={selectButton}>{clip.title}</button>
                <span style={meta}>{Math.round(clip.durationMs / 1000)}s</span>
                <span style={meta}>{clip.matchId || "—"}</span>
                <button onClick={() => { setPreviewId(clip.id); setPreviewElapsed(0); }} style={secondary}>PREVIEW</button>
                <button onClick={() => removeClip(clip.id)} style={danger}>REMOVE</button>
              </div>)}
              {!clips.length && <div style={empty}>No replay clips configured. Add a clip below.</div>}
            </div>
          </div>

          <div style={panel}>
            <div style={eyebrow}>OPERATOR ACTION</div>
            <h2 style={sectionTitle}>{activeReplay?.title ?? "No clip selected"}</h2>
            <button onClick={playReplay} disabled={!selected} style={{ ...primary, opacity: selected ? 1 : .4 }}>PLAY REPLAY</button>
            <button onClick={endReplay} disabled={!tournamentId} style={secondaryWide}>END REPLAY · SEND GAMEPLAY</button>
            <p style={muted}>END REPLAY only sends Gameplay when the operator presses it. There is no automatic return.</p>
          </div>
        </section>

        <section style={{ ...panel, marginTop: 18 }}>
          <div style={eyebrow}>PREVIEW</div><h2 style={sectionTitle}>Replay monitor</h2>
          <div style={monitor}>
            {preview?.thumbnailUrl ? <img src={preview.thumbnailUrl} alt="" style={thumb} /> : <div style={monitorFallback}>INSTANT REPLAY</div>}
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: .65 }}><span>{preview?.title ?? "NO CLIP"}</span><span>{Math.round(previewProgress * 100)}%</span></div><div style={track}><div style={{ ...fill, width: `${previewProgress * 100}%` }} /></div></div>
          </div>
        </section>

        <section style={{ ...panel, marginTop: 18 }}>
          <div style={eyebrow}>REPLAY BUMPER</div><h2 style={sectionTitle}>Native transition package</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .7fr .7fr", gap: 12, marginTop: 14 }}>
            <Field label="LABEL" value={bumper.label} onChange={(value) => setBumper((item) => normalizeReplayBumper({ ...item, label: value }))} />
            <Field label="DURATION MS" type="number" value={String(bumper.durationMs)} onChange={(value) => setBumper((item) => normalizeReplayBumper({ ...item, durationMs: Number(value) || 500 }))} />
            <label style={smallLabel}>ENABLED<input type="checkbox" checked={bumper.enabled} onChange={(event) => setBumper((item) => normalizeReplayBumper({ ...item, enabled: event.target.checked }))} style={{ display: "block", marginTop: 10 }} /></label>
          </div>
        </section>

        <section style={{ ...panel, marginTop: 18 }}>
          <div style={eyebrow}>ADD CLIP</div><h2 style={sectionTitle}>New replay source</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.4fr .7fr", gap: 10, marginTop: 14 }}>
            <Field label="TITLE" value={title} onChange={setTitle} placeholder="Round 3 clutch" />
            <Field label="SOURCE URL" value={sourceUrl} onChange={setSourceUrl} placeholder="https://…" />
            <Field label="THUMBNAIL URL" value={thumbnailUrl} onChange={setThumbnailUrl} placeholder="https://…" />
            <Field label="DURATION MS" type="number" value={String(durationMs)} onChange={(value) => setDurationMs(Number(value) || 1000)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginTop: 10, alignItems: "end" }}><Field label="MATCH ID" value={matchId} onChange={setMatchId} placeholder="Optional" /><Field label="STATION ID" value={stationId} onChange={setStationId} placeholder="Optional" /><button onClick={addClip} disabled={!title.trim()} style={{ ...primary, opacity: title.trim() ? 1 : .4 }}>ADD CLIP</button></div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label style={smallLabel}>{label}<input value={value} type={type} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={{ ...input, width: "100%", marginTop: 7 }} /></label>; }
const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 } as const;
const item = { display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, background: "#10131b", border: "1px solid #252936" } as const;
const eyebrow = { fontSize: 10, letterSpacing: ".18em", opacity: .45 } as const;
const title = { fontSize: 34, margin: "7px 0 0" } as const;
const sectionTitle = { fontSize: 18, margin: "6px 0 0" } as const;
const muted = { fontSize: 11, opacity: .5, marginTop: 5 } as const;
const rowHeader = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 18 } as const;
const smallLabel = { fontSize: 10, letterSpacing: ".12em", opacity: .65, display: "block" } as const;
const input = { border: "1px solid #2b2f3c", borderRadius: 9, background: "#080a10", color: "white", padding: "9px 10px", boxSizing: "border-box" as const };
const primary = { border: "1px solid #3b2a67", borderRadius: 9, background: "#7c3aed", color: "white", padding: "11px 14px", fontWeight: 800, cursor: "pointer", width: "100%", marginTop: 10 } as const;
const secondary = { border: "1px solid #2b2f3c", borderRadius: 8, background: "#11131a", color: "white", padding: "8px 10px", fontWeight: 700, cursor: "pointer" } as const;
const secondaryWide = { ...secondary, width: "100%", marginTop: 10 } as const;
const danger = { border: "1px solid #4a2931", borderRadius: 8, background: "#171015", color: "#fda4af", padding: "8px 10px", fontWeight: 700, cursor: "pointer" } as const;
const selectButton = { flex: 1, textAlign: "left" as const, border: 0, background: "transparent", color: "white", fontWeight: 800, cursor: "pointer" };
const meta = { fontSize: 10, opacity: .45, minWidth: 45, textAlign: "center" as const };
const status = { fontSize: 9, letterSpacing: ".14em", color: "#c4b5fd" };
const link = { color: "#c4b5fd", textDecoration: "none", fontSize: 11, letterSpacing: ".12em" } as const;
const empty = { border: "1px dashed #303441", borderRadius: 12, padding: 22, textAlign: "center" as const, opacity: .55, fontSize: 12 };
const monitor = { minHeight: 280, marginTop: 14, borderRadius: 14, background: "#08090e", border: "1px solid #2b2f3c", position: "relative" as const, overflow: "hidden" };
const thumb = { width: "100%", height: "100%", minHeight: 280, objectFit: "cover" as const, opacity: .7 };
const monitorFallback = { minHeight: 280, display: "grid", placeItems: "center", fontSize: 34, fontWeight: 900, letterSpacing: ".08em", opacity: .25 };
const track = { height: 4, borderRadius: 99, background: "#292d38", marginTop: 6, overflow: "hidden" };
const fill = { height: "100%", borderRadius: 99, background: "#8b5cf6" };
