"use client";

import { useEffect, useState } from "react";
import { DEFAULT_OBS_SCENE_MAPPING, normalizeObsSceneMapping, type ObsSceneMapping } from "@/lib/broadcast/obs";
import type { BroadcastScene } from "@/lib/broadcast/production";

const storagePrefix = "fgc-broadcast-obs-mapping:";
const scenes = Object.keys(DEFAULT_OBS_SCENE_MAPPING) as BroadcastScene[];

export default function ObsSceneMappingPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState("");
  const [mapping, setMapping] = useState<ObsSceneMapping>(DEFAULT_OBS_SCENE_MAPPING);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void params.then(async ({ tournamentId: id }) => {
      setTournamentId(id);
      try {
        const raw = window.localStorage.getItem(`${storagePrefix}${id}`);
        if (raw) setMapping(normalizeObsSceneMapping(JSON.parse(raw) as Partial<ObsSceneMapping>));
      } catch { /* server state below remains authoritative when available */ }
      try {
        const response = await fetch(`/api/broadcast/state?tournamentId=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { persistent?: { obsMapping?: Partial<ObsSceneMapping> } };
        if (payload.persistent?.obsMapping) setMapping(normalizeObsSceneMapping(payload.persistent.obsMapping));
      } catch { /* local defaults remain usable */ }
    });
  }, [params]);

  function update(scene: BroadcastScene, value: string) { setMapping((current) => ({ ...current, [scene]: value })); setSaved(false); }
  async function save() {
    if (!tournamentId) return;
    window.localStorage.setItem(`${storagePrefix}${tournamentId}`, JSON.stringify(mapping));
    const response = await fetch("/api/broadcast/state", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, patch: { obsMapping: mapping } }) });
    setSaved(response.ok);
  }
  async function reset() {
    setMapping(DEFAULT_OBS_SCENE_MAPPING);
    if (tournamentId) {
      window.localStorage.removeItem(`${storagePrefix}${tournamentId}`);
      await fetch("/api/broadcast/state", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, patch: { obsMapping: DEFAULT_OBS_SCENE_MAPPING } }) });
    }
    setSaved(false);
  }

  return <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}><div style={{ maxWidth: 980, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", marginBottom: 24 }}><div><div style={{ fontSize: 11, letterSpacing: ".2em", opacity: .45 }}>FGC BROADCAST STUDIO</div><h1 style={{ fontSize: 34, margin: "7px 0 0" }}>OBS Scene Mapping</h1><p style={{ margin: "8px 0 0", opacity: .55, fontSize: 13 }}>Persist the exact OBS scene names used by the tournament production setup.</p></div><a href={`/broadcast/${tournamentId}/control-room`} style={link}>← CONTROL ROOM</a></header>
    <section style={panel}><div style={gridHeader}><span>FGC SCENE</span><span>OBS SCENE</span></div>{scenes.map((scene) => <div key={scene} style={row}><div><strong>{scene.replace("-", " ").toUpperCase()}</strong><small style={small}>Browser Source runtime event</small></div><input value={mapping[scene]} onChange={(event) => update(scene, event.target.value)} aria-label={`OBS scene for ${scene}`} style={input} /></div>)}<div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}><button onClick={() => void save()} style={button(true)}>SAVE MAPPING</button><button onClick={() => void reset()} style={button(false)}>RESET DEFAULTS</button>{saved && <span style={{ fontSize: 12, color: "#22c55e" }}>Persisted for this tournament</span>}</div></section>
    <section style={{ ...panel, marginTop: 14 }}><div style={label}>HOW IT WORKS</div><div style={{ marginTop: 10, display: "grid", gap: 8, fontSize: 13, opacity: .7 }}><div>1. Match each FGC scene to the exact scene name in OBS.</div><div>2. Use TAKE PREVIEW or the production timeline from the control room.</div><div>3. The mapping is now durable across Control Rooms and operator browsers.</div></div></section>
  </div></main>;
}

const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 } as const;
const gridHeader = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 0 10px", fontSize: 10, letterSpacing: ".15em", opacity: .4 } as const;
const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center", padding: "14px 0", borderTop: "1px solid #1c1f28" } as const;
const input = { width: "100%", boxSizing: "border-box", background: "#11131a", border: "1px solid #2b2f3c", borderRadius: 9, color: "white", padding: "11px 12px", outline: "none" } as const;
const label = { fontSize: 10, letterSpacing: ".15em", opacity: .45 } as const;
const small = { display: "block", marginTop: 4, fontSize: 10, opacity: .4 } as const;
const link = { color: "#c4b5fd", textDecoration: "none", fontSize: 11, letterSpacing: ".12em" } as const;
const button = (active: boolean) => ({ border: "1px solid #2b2f3c", borderRadius: 9, padding: "11px 15px", background: active ? "#7c3aed" : "#11131a", color: "white", fontWeight: 700, cursor: "pointer" });