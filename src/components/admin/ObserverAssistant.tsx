"use client";
import { useEffect, useMemo, useState } from "react";
import { ObsWebSocketClient } from "@/lib/obs-websocket";

type Team = { key: string; label: string; alive?: number | null; kills?: number; points?: number };
type Fight = { id: string; teamKeys: string[]; intensity: number; label?: string; updatedAt?: string };
type Recommendation = { teamKey: string; label: string; priority: number; reason: string };

type Props = { tournamentId: string; matchId: string | null; initialObserver?: any };

export function ObserverAssistant({ tournamentId, matchId, initialObserver }: Props) {
  const [mode, setMode] = useState<"FREE" | "TEAM">(initialObserver?.mode ?? "FREE");
  const [currentTeamKey, setCurrentTeamKey] = useState<string | null>(initialObserver?.currentTeamKey ?? null);
  const [teams, setTeams] = useState<Team[]>(initialObserver?.teams ?? []);
  const [fights, setFights] = useState<Fight[]>(initialObserver?.fights ?? []);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [busy, setBusy] = useState(false);
  const [obsStatus, setObsStatus] = useState("Not connected");
  const [obsScene, setObsScene] = useState("");
  const [obsUrl, setObsUrl] = useState("ws://127.0.0.1:4455");
  const [obsPassword, setObsPassword] = useState("");
  const [scoreboardSource, setScoreboardSource] = useState("FGC Scoreboard");
  const [lowerThirdSource, setLowerThirdSource] = useState("FGC Lower Third");
  const [transitionName, setTransitionName] = useState("Fade");
  const [obs, setObs] = useState<ObsWebSocketClient | null>(null);
  const [matchState, setMatchState] = useState<{ status?: string; round?: string | null; stage?: { name: string; kind: string; orderIndex: number; status: string } | null }>({});

  const top = recommendations[0];
  const save = async (next: Partial<{ mode: "FREE" | "TEAM"; currentTeamKey: string | null; teams: Team[]; fights: Fight[] }> = {}) => {
    if (!matchId) return;
    setBusy(true);
    try {
      const payload = { matchId, mode: next.mode ?? mode, currentTeamKey: next.currentTeamKey ?? currentTeamKey, teams: next.teams ?? teams, fights: next.fights ?? fights };
      const res = await fetch(`/api/tournaments/${tournamentId}/observer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save observer state");
      setRecommendations(data.recommendations ?? []);
      setMatchState(data.matchState ?? {});
    } catch (e) { setObsStatus(e instanceof Error ? e.message : "Observer update failed"); }
    finally { setBusy(false); }
  };

  useEffect(() => { if (!matchId) return; void fetch(`/api/tournaments/${tournamentId}/observer`, { cache: "no-store" }).then(r => r.json()).then(data => { if (data.observer) { setMode(data.observer.mode); setCurrentTeamKey(data.observer.currentTeamKey); setTeams(data.observer.teams ?? []); setFights(data.observer.fights ?? []); } setRecommendations(data.recommendations ?? []); setMatchState(data.matchState ?? {}); }).catch(() => undefined); }, [tournamentId, matchId]);

  const selected = useMemo(() => teams.find(t => t.key === currentTeamKey), [teams, currentTeamKey]);
  const take = async (teamKey: string) => { setMode("TEAM"); setCurrentTeamKey(teamKey); await save({ mode: "TEAM", currentTeamKey: teamKey }); };
  const setFree = async () => { setMode("FREE"); setCurrentTeamKey(null); await save({ mode: "FREE", currentTeamKey: null }); };
  const toggleFight = async (teamKey: string) => {
    const id = `fight-${teamKey}`;
    const existing = fights.find(f => f.id === id);
    const next = existing ? fights.filter(f => f.id !== id) : [...fights, { id, teamKeys: [teamKey], intensity: 80, label: `${teams.find(t => t.key === teamKey)?.label ?? teamKey} active fight`, updatedAt: new Date().toISOString() }];
    setFights(next); await save({ fights: next });
  };

  const connectObs = async () => {
    const client = new ObsWebSocketClient(obsUrl, obsPassword || undefined);
    try { await client.connect(); const info = await client.request<{ currentProgramSceneName?: string }>("GetCurrentProgramScene"); setObs(client); setObsScene(info.currentProgramSceneName ?? ""); setObsStatus("Connected"); }
    catch (e) { setObsStatus(e instanceof Error ? e.message : "OBS connection failed"); client.disconnect(); }
  };
  const obsRequest = async (type: string, data: Record<string, unknown> = {}) => { if (!obs) return; try { await obs.request(type, data); setObsStatus(`OBS: ${type}`); if (type === "SetCurrentProgramScene") setObsScene(String(data.sceneName ?? "")); } catch (e) { setObsStatus(e instanceof Error ? e.message : "OBS command failed"); } };
  const updateObsGraphics = async () => {
    if (!obs) return;
    const team = selected?.label ?? "Free Camera";
    await obsRequest("SetInputSettings", { inputName: scoreboardSource, inputSettings: { text: `${team} · ${selected?.kills ?? 0} KILLS · ${selected?.points ?? 0} PTS` }, overlay: true });
    await obsRequest("SetInputSettings", { inputName: lowerThirdSource, inputSettings: { text: `${team} POV${top ? ` · PRIORITY ${top.priority}` : ""}` }, overlay: true });
  };

  return <section className="rounded-card border border-arena-600 bg-arena-900 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">BGMI observer assistant</p><h2 className="font-display text-xl uppercase tracking-wide">One spectator · smarter camera decisions</h2><p className="mt-1 text-xs text-ink-faint">The BGMI observer remains the camera operator. FGC Stream identifies fights and recommends the next POV.</p></div>
      <div className="rounded-card border border-arena-700 bg-arena-950 px-3 py-2 font-mono text-[10px] uppercase">{mode} {selected ? `· ${selected.label}` : "· Free camera"}</div>
    </div>
    {!matchId ? <p className="mt-4 text-sm text-ink-faint">Select a live BR match to activate observer assistance.</p> : <>
      <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase text-ink-faint"><span className="rounded border border-arena-700 px-2 py-1">Match {matchState.status ?? "—"}</span><span className="rounded border border-arena-700 px-2 py-1">{matchState.stage?.name ?? "Stage —"}</span><span className="rounded border border-arena-700 px-2 py-1">{matchState.stage?.kind ?? matchState.round ?? "BR"}</span></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-card border border-arena-700 bg-arena-950 p-3">
          <div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Teams / POV</span><button onClick={() => void setFree()} disabled={busy} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Free camera</button></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{teams.map(team => { const rec = recommendations.find(r => r.teamKey === team.key); const active = currentTeamKey === team.key; const fighting = fights.some(f => f.teamKeys.includes(team.key)); return <div key={team.key} className={`rounded-card border p-3 ${active ? "border-signal-live bg-signal-live/10" : "border-arena-700"}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold">{team.label}</span>{fighting && <span className="font-mono text-[9px] uppercase text-signal-error">Fight</span>}</div><div className="mt-1 font-mono text-[10px] text-ink-faint">{team.kills ?? 0} kills · {team.alive ?? "?"} alive · {team.points ?? 0} pts</div><div className="mt-3 flex gap-2"><button onClick={() => void take(team.key)} disabled={busy} className="rounded-card border border-signal-live/40 px-2 py-1.5 font-mono text-[9px] uppercase text-signal-live">Take POV</button><button onClick={() => void toggleFight(team.key)} disabled={busy} className="rounded-card border border-arena-600 px-2 py-1.5 font-mono text-[9px] uppercase">{fighting ? "Clear fight" : "Mark fight"}</button></div>{rec && <p className="mt-2 text-[10px] text-yellow-300">Priority {rec.priority} · {rec.reason}</p>}</div> })}</div>
        </div>
        <div className="rounded-card border border-signal-live/40 bg-arena-950 p-3"><div className="font-mono text-[10px] uppercase tracking-widest text-signal-live">Recommended POV</div>{top ? <><div className="mt-3 text-2xl font-semibold">{top.label}</div><div className="mt-1 font-mono text-xs">Priority {top.priority}/100</div><p className="mt-2 text-xs text-ink-faint">{top.reason}</p><button onClick={() => void take(top.teamKey)} disabled={busy} className="mt-4 w-full rounded-card border border-signal-live px-3 py-3 font-mono text-[10px] uppercase text-signal-live">Take recommended POV</button></> : <p className="mt-3 text-sm text-ink-faint">No active fight recommendation. Stay on free camera.</p>}</div>
      </div>
      <div className="mt-4 rounded-card border border-arena-700 bg-arena-950 p-3"><div className="mb-3 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">OBS bridge</p><p className="mt-1 text-[10px] text-ink-faint">Optional local OBS WebSocket control. OBS remains on the observer PC.</p></div><span className="font-mono text-[10px] uppercase text-ink-faint">{obsStatus}</span></div><div className="grid gap-2 md:grid-cols-4"><input value={obsUrl} onChange={e => setObsUrl(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="ws://127.0.0.1:4455"/><input value={obsPassword} onChange={e => setObsPassword(e.target.value)} type="password" className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="OBS password"/><button onClick={() => void connectObs()} className="rounded-card border border-signal-live/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-live">Connect OBS</button><div className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Scene: {obsScene || "—"}</div></div>{obs && <>
        <div className="mt-3 grid gap-2 md:grid-cols-3"><input value={scoreboardSource} onChange={e => setScoreboardSource(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="Scoreboard text source"/><input value={lowerThirdSource} onChange={e => setLowerThirdSource(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="Lower-third text source"/><input value={transitionName} onChange={e => setTransitionName(e.target.value)} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-xs" placeholder="OBS transition"/></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void obsRequest("SetCurrentProgramScene", { sceneName: "MATCH" })} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Match scene</button><button onClick={() => void obsRequest("SetCurrentProgramScene", { sceneName: "WAITING" })} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Waiting scene</button><button onClick={() => void obsRequest("SetCurrentSceneTransition", { transitionName })} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Transition</button><button onClick={() => void updateObsGraphics()} className="rounded-card border border-signal-live/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-live">Update graphics</button><button onClick={() => void obsRequest("StartStream")} className="rounded-card border border-signal-live/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-live">Start stream</button><button onClick={() => void obsRequest("StopStream")} className="rounded-card border border-signal-error/40 px-3 py-2 font-mono text-[10px] uppercase text-signal-error">Stop stream</button><button onClick={() => void obsRequest("StartRecord")} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Record</button><button onClick={() => void obsRequest("StopRecord")} className="rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase">Stop record</button></div></>}</div>
    </>}
  </section>;
}
