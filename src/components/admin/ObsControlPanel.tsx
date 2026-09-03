"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ObsWebSocketClient,
  buildObsGraphics,
  mapBroadcastSceneToObsScene,
  type ObsRecordStatus,
  type ObsScene,
  type ObsStreamStatus,
  type ObsTransition,
} from "@/lib/obs-websocket";

type BroadcastScene = "OFFLINE" | "WAITING" | "MATCH" | "BREAK" | "INTERMISSION" | "RESULTS";

type Props = {
  tournamentId: string;
  broadcast: {
    scene: BroadcastScene;
    overlay: Record<string, unknown> | null;
    matchId: string | null;
  };
  matchLabel?: string;
};

const DEFAULT_MAPPING: Record<BroadcastScene, string> = {
  OFFLINE: "OFFLINE",
  WAITING: "WAITING",
  MATCH: "MATCH",
  BREAK: "BREAK",
  INTERMISSION: "INTERMISSION",
  RESULTS: "RESULTS",
};

export function ObsControlPanel({ broadcast, matchLabel }: Props) {
  const [url, setUrl] = useState("ws://127.0.0.1:4455");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [scene, setScene] = useState("");
  const [scenes, setScenes] = useState<ObsScene[]>([]);
  const [transitions, setTransitions] = useState<ObsTransition[]>([]);
  const [transition, setTransition] = useState("Fade");
  const [scoreboardSource, setScoreboardSource] = useState("FGC Scoreboard");
  const [lowerThirdSource, setLowerThirdSource] = useState("FGC Lower Third");
  const [overlaySource, setOverlaySource] = useState("FGC Overlay");
  const [stream, setStream] = useState<ObsStreamStatus>({});
  const [record, setRecord] = useState<ObsRecordStatus>({});
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const clientRef = useRef<ObsWebSocketClient | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fgc.obs.config");
      if (!saved) return;
      const data = JSON.parse(saved) as Partial<typeof DEFAULT_MAPPING> & { url?: string; scoreboardSource?: string; lowerThirdSource?: string; overlaySource?: string };
      if (data.url) setUrl(data.url);
      if (data.scoreboardSource) setScoreboardSource(data.scoreboardSource);
      if (data.lowerThirdSource) setLowerThirdSource(data.lowerThirdSource);
      if (data.overlaySource) setOverlaySource(data.overlaySource);
      setMapping((current) => ({ ...current, ...data }));
    } catch { /* ignore malformed local config */ }
  }, []);

  useEffect(() => () => clientRef.current?.disconnect(), []);

  const persistConfig = () => {
    localStorage.setItem("fgc.obs.config", JSON.stringify({ url, scoreboardSource, lowerThirdSource, overlaySource, ...mapping }));
  };

  const refreshStatus = async (client: ObsWebSocketClient) => {
    const [nextScene, nextScenes, nextTransitions, nextStream, nextRecord] = await Promise.all([
      client.getProgramScene(),
      client.getScenes(),
      client.getTransitions(),
      client.getStreamStatus(),
      client.getRecordStatus(),
    ]);
    setScene(nextScene);
    setScenes(nextScenes);
    setTransitions(nextTransitions);
    setStream(nextStream);
    setRecord(nextRecord);
    if (!transition && nextTransitions[0]) setTransition(nextTransitions[0].name);
  };

  const connect = async () => {
    clientRef.current?.disconnect();
    const client = new ObsWebSocketClient(url, password || undefined);
    setBusy(true);
    setStatus("Connecting…");
    try {
      await client.connect();
      client.onEvent((message) => {
        const eventType = String(message.d.eventType ?? "");
        const eventData = (message.d.eventData ?? {}) as Record<string, unknown>;
        if (eventType === "CurrentProgramSceneChanged") setScene(String(eventData.sceneName ?? ""));
        if (eventType === "StreamStateChanged") setStream(eventData as ObsStreamStatus);
        if (eventType === "RecordStateChanged") setRecord(eventData as ObsRecordStatus);
      });
      clientRef.current = client;
      await refreshStatus(client);
      setStatus("Connected");
      persistConfig();
    } catch (error) {
      client.disconnect();
      setStatus(error instanceof Error ? error.message : "OBS connection failed");
    } finally { setBusy(false); }
  };

  const request = async (type: string, data: Record<string, unknown> = {}) => {
    const client = clientRef.current;
    if (!client) return;
    setBusy(true);
    try {
      await client.request(type, data);
      await refreshStatus(client);
      setStatus(`OBS: ${type}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "OBS command failed");
    } finally { setBusy(false); }
  };

  const syncGraphics = async () => {
    const client = clientRef.current;
    if (!client) return;
    const overlay = broadcast.overlay ?? {};
    const graphics = buildObsGraphics({
      tournament: "FGC Stream",
      game: String(overlay.game ?? ""),
      stage: String(overlay.stage ?? ""),
      match: matchLabel ?? (broadcast.matchId ? `Match ${broadcast.matchId}` : ""),
      title: String(overlay.title ?? ""),
      sponsor: String(overlay.sponsor ?? ""),
      message: String(overlay.message ?? ""),
    });
    await request("SetInputSettings", { inputName: scoreboardSource, inputSettings: { text: graphics.scoreboard }, overlay: true });
    await request("SetInputSettings", { inputName: lowerThirdSource, inputSettings: { text: graphics.lowerThird }, overlay: true });
    if (overlaySource.trim()) await request("SetInputSettings", { inputName: overlaySource, inputSettings: { text: graphics.overlay }, overlay: true });
  };

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    void request("SetCurrentProgramScene", { sceneName: mapBroadcastSceneToObsScene(broadcast.scene, mapping) });
    // Scene changes are the primary automatic director → OBS synchronization point.
    // Graphics are updated only after an explicit broadcast state change, not while typing.
    void syncGraphics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcast.scene, broadcast.matchId, broadcast.overlay]);

  const mappedScene = useMemo(() => mapBroadcastSceneToObsScene(broadcast.scene, mapping), [broadcast.scene, mapping]);
  const connected = !!clientRef.current && status === "Connected";

  return (
    <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">OBS integration · v31.10</p>
          <h2 className="font-display text-xl uppercase tracking-wide">Program output bridge</h2>
          <p className="mt-1 text-xs text-ink-faint">FGC Stream controls OBS presentation. The game observer still controls the in-game spectator camera.</p>
        </div>
        <span className="rounded-card border border-arena-700 px-3 py-2 font-mono text-[10px] uppercase">{status}</span>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr_auto]">
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-xs" placeholder="ws://127.0.0.1:4455" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="rounded-card border border-arena-600 bg-arena-950 px-3 py-2 text-xs" placeholder="OBS WebSocket password" />
        <button type="button" onClick={() => void connect()} disabled={busy} className="rounded-card border border-signal-live/50 px-4 py-2 font-mono text-[10px] uppercase text-signal-live disabled:opacity-40">{connected ? "Reconnect OBS" : "Connect OBS"}</button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-card border border-arena-700 bg-arena-950 p-3">
          <div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Scenes</span><span className="font-mono text-[10px] uppercase text-ink-faint">Program: {scene || "—"}</span></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(DEFAULT_MAPPING) as BroadcastScene[]).map((key) => (
              <label key={key} className="grid gap-1 font-mono text-[9px] uppercase text-ink-faint"><span>{key}</span><select value={mapping[key]} onChange={(e) => setMapping((current) => ({ ...current, [key]: e.target.value }))} className="rounded-card border border-arena-600 bg-arena-900 px-2 py-2 text-xs normal-case"><option value={key}>{key}</option>{scenes.map((item) => <option key={`${key}-${item.name}`} value={item.name}>{item.name}</option>)}</select></label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!connected || busy} onClick={() => void request("SetCurrentProgramScene", { sceneName: mappedScene })} className="rounded-card border border-signal-live/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-live disabled:opacity-40">Take {mappedScene}</button><button type="button" onClick={persistConfig} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Save mapping</button></div>
        </div>

        <div className="rounded-card border border-arena-700 bg-arena-950 p-3">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">Graphics & transitions</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={scoreboardSource} onChange={(e) => setScoreboardSource(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="FGC Scoreboard" />
            <input value={lowerThirdSource} onChange={(e) => setLowerThirdSource(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="FGC Lower Third" />
            <input value={overlaySource} onChange={(e) => setOverlaySource(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="FGC Overlay (optional)" />
            <select value={transition} onChange={(e) => setTransition(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs"><option value="">OBS transition…</option>{transitions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!connected || busy || !transition} onClick={() => void request("SetCurrentSceneTransition", { transitionName: transition })} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase disabled:opacity-40">Use transition</button><button type="button" disabled={!connected || busy} onClick={() => void syncGraphics()} className="rounded-card border border-signal-live/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-live disabled:opacity-40">Sync graphics</button></div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-arena-700 bg-arena-950 p-3"><div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Stream</div><div className="mt-2 font-mono text-sm">{stream.outputActive ? "LIVE" : "STOPPED"}{stream.outputReconnecting ? " · RECONNECTING" : ""}</div><div className="mt-3 flex gap-2"><button type="button" disabled={!connected || busy || !!stream.outputActive} onClick={() => void request("StartStream")} className="rounded-card border border-signal-live/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-live disabled:opacity-40">Start stream</button><button type="button" disabled={!connected || busy || !stream.outputActive} onClick={() => void request("StopStream")} className="rounded-card border border-signal-error/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-error disabled:opacity-40">Stop stream</button></div></div>
        <div className="rounded-card border border-arena-700 bg-arena-950 p-3"><div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Recording</div><div className="mt-2 font-mono text-sm">{record.outputActive ? "RECORDING" : "STOPPED"}{record.outputPaused ? " · PAUSED" : ""}</div><div className="mt-3 flex gap-2"><button type="button" disabled={!connected || busy || !!record.outputActive} onClick={() => void request("StartRecord")} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase disabled:opacity-40">Start record</button><button type="button" disabled={!connected || busy || !record.outputActive} onClick={() => void request("StopRecord")} className="rounded-card border border-signal-error/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-error disabled:opacity-40">Stop record</button></div></div>
      </div>
    </section>
  );
}
