"use client";

import { useEffect, useState } from "react";
import { DEFAULT_OBS_SCENE_MAPPING, normalizeObsSceneMapping, type ObsSceneMapping } from "@/lib/broadcast/obs";
import type { BroadcastScene } from "@/lib/broadcast/production";

const scenes = Object.keys(DEFAULT_OBS_SCENE_MAPPING) as BroadcastScene[];
export default function ObsSceneMappingPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState("");
  const [mapping, setMapping] = useState<ObsSceneMapping>(DEFAULT_OBS_SCENE_MAPPING);
  const [status, setStatus] = useState("LOADING");
  useEffect(() => { void params.then(async ({ tournamentId: id }) => { setTournamentId(id); try { const response = await fetch(`/api/broadcast/state?tournamentId=${encodeURIComponent(id)}`); if (!response.ok) throw new Error(); const result = await response.json() as { persistent?: { obsMapping?: Partial<ObsSceneMapping> } }; setMapping(normalizeObsSceneMapping(result.persistent?.obsMapping)); setStatus("READY"); } catch { setStatus("ERROR"); } }); }, [params]);
  function update(scene: BroadcastScene, value: string) { setMapping((current) => ({ ...current, [scene]: value })); setStatus("UNSAVED"); }
  async function save() { if (!tournamentId) return; setStatus("SAVING"); try { const response = await fetch("/api/broadcast/state", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, patch: { obsMapping: mapping } }) }); if (!response.ok) throw new Error(); setStatus("SAVED"); } catch { setStatus("ERROR"); } }
  return <main><h1>OBS Scene Mapping</h1>{scenes.map((scene) => <div key={scene}><label>{scene}</label><input value={mapping[scene]} onChange={(event) => update(scene, event.target.value)} /></div>)}<button onClick={save}>SAVE MAPPING</button><span>{status}</span></main>;
}