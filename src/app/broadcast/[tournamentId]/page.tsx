"use client";

import { useEffect, useMemo, useState } from "react";
import type { BroadcastCommandType, BroadcastScene } from "@/lib/broadcast/production";
import type { BroadcastDestination, BroadcastDestinationProvider } from "@/lib/broadcast/destinations";

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
type YouTubeConnection = { connected: true; channelId?: string; channelName?: string; connectedAt: string } | null;

export default function BroadcastProductionConsole({ params }: BroadcastPageProps) {
  const [active, setActive] = useState<BroadcastScene>("gameplay");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<BroadcastDestination[]>([]);
  const [provider, setProvider] = useState<BroadcastDestinationProvider>("youtube");
  const [label, setLabel] = useState("");
  const [channelName, setChannelName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [savingDestination, setSavingDestination] = useState(false);
  const [youtubeConnection, setYoutubeConnection] = useState<YouTubeConnection>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    void params.then(({ tournamentId: id }) => {
      if (mounted) setTournamentId(id);
    });
    return () => { mounted = false; };
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;
    void Promise.all([
      fetch(`/api/broadcast/destinations?tournamentId=${encodeURIComponent(tournamentId)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load destinations"))),
      fetch(`/api/broadcast/youtube/status?tournamentId=${encodeURIComponent(tournamentId)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load YouTube status"))),
    ])
      .then(([destinationData, youtubeData]: [{ destinations: BroadcastDestination[] }, { connection: YouTubeConnection }]) => {
        setDestinations(destinationData.destinations ?? []);
        setYoutubeConnection(youtubeData.connection ?? null);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load broadcast configuration"));
  }, [tournamentId]);

  const groups = useMemo(() => [SCENES.slice(0, 4), SCENES.slice(4)], []);

  async function send(scene: BroadcastScene, type: BroadcastCommandType) {
    if (!tournamentId) return;
    setBusy(true);
    setMessage(`Sending ${scene}…`);
    try {
      const response = await fetch("/api/broadcast/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, scene, type }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Command failed");
      setActive(scene);
      setMessage(`Program: ${scene}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Command failed");
    } finally {
      setBusy(false);
    }
  }

  async function connectYouTube() {
    if (!tournamentId) return;
    setYoutubeLoading(true);
    setMessage("Opening YouTube authorization…");
    window.location.href = `/api/broadcast/youtube/connect?tournamentId=${encodeURIComponent(tournamentId)}`;
  }

  async function addDestination() {
    if (!tournamentId || !label.trim()) return;
    setSavingDestination(true);
    setMessage("Saving broadcast destination…");
    try {
      const response = await fetch("/api/broadcast/destinations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, provider, label, channelName, streamUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save destination");
      setDestinations(data.destinations ?? []);
      setLabel("");
      setChannelName("");
      setStreamUrl("");
      setMessage("Destination saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save destination");
    } finally {
      setSavingDestination(false);
    }
  }

  async function removeDestination(destinationId: string) {
    if (!tournamentId) return;
    const response = await fetch("/api/broadcast/destinations", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, destinationId }) });
    const data = await response.json();
    if (response.ok) setDestinations(data.destinations ?? []);
    else setMessage(data.error ?? "Could not remove destination");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, marginBottom: 28 }}>
          <div><div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", opacity: .55 }}>FGC Broadcast Studio</div><h1 style={{ margin: "8px 0 0", fontSize: 36, lineHeight: 1 }}>Production Console</h1></div>
          <div style={{ padding: "10px 14px", border: "1px solid #252936", borderRadius: 999, fontSize: 13, background: "#0d0f16" }}>● LIVE · {message}</div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 18 }}>
          <div style={{ border: "1px solid #222631", borderRadius: 20, background: "linear-gradient(145deg,#10131b,#090a10)", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><span style={{ fontSize: 13, opacity: .55 }}>PROGRAM</span><strong style={{ color: "#9f7aea" }}>{active.toUpperCase()}</strong></div>
            <div style={{ aspectRatio: "16/9", borderRadius: 14, border: "1px solid #292d39", display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 40%,#24183b 0,#0b0c12 55%)", overflow: "hidden" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 12, letterSpacing: ".2em", opacity: .45 }}>FGC LIVE</div><div style={{ fontSize: 52, fontWeight: 800, textTransform: "uppercase", marginTop: 8 }}>{active.replaceAll("-", " ")}</div><div style={{ marginTop: 12, opacity: .5, fontSize: 13 }}>OBS Browser Source · Realtime</div></div></div>
          </div>
          <aside style={{ display: "grid", gap: 12 }}>{groups.map((group, index) => <div key={index} style={{ border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 14, display: "grid", gap: 10 }}>{group.map((item) => <button key={item.scene} disabled={busy || !tournamentId} onClick={() => send(item.scene, item.type)} style={{ textAlign: "left", border: active === item.scene ? "1px solid #8b5cf6" : "1px solid #242936", borderRadius: 12, padding: "13px 14px", background: active === item.scene ? "#171127" : "#101219", color: "#fff", cursor: busy ? "wait" : "pointer" }}><div style={{ fontWeight: 700 }}>{item.label}</div><div style={{ fontSize: 11, opacity: .45, marginTop: 3 }}>{item.type}</div></button>)}</div>)}</aside>
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>{["Program", "Preview", "OBS Sync"].map((labelValue, i) => <div key={labelValue} style={{ border: "1px solid #222631", borderRadius: 16, background: "#0c0e14", padding: 16 }}><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>{labelValue}</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 750 }}>{i === 0 ? active : i === 1 ? "Standby" : "Connected"}</div></div>)}</section>

        <section style={{ marginTop: 18, border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}><div><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>YouTube</div><h2 style={{ margin: "5px 0 0", fontSize: 22 }}>Connect the organizer's channel</h2></div><span style={{ fontSize: 12, opacity: .5 }}>{youtubeConnection ? "Connected" : "Not connected"}</span></div>
          {youtubeConnection ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: "1px solid #263329", borderRadius: 12, padding: "14px 16px", background: "#0e1510" }}><div><strong>{youtubeConnection.channelName || "YouTube channel"}</strong><div style={{ fontSize: 12, opacity: .55, marginTop: 4 }}>OAuth connected · refresh token encrypted server-side</div></div><button disabled={youtubeLoading} onClick={connectYouTube} style={{ border: "1px solid #343946", borderRadius: 9, padding: "8px 12px", background: "transparent", color: "#fff", cursor: "pointer" }}>Reconnect</button></div> : <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: "1px solid #242936", borderRadius: 12, padding: "14px 16px", background: "#101219" }}><div><strong>Not connected</strong><div style={{ fontSize: 12, opacity: .5, marginTop: 4 }}>Authorize once; FGC Stream keeps the credential encrypted for this tournament.</div></div><button disabled={youtubeLoading || !tournamentId} onClick={connectYouTube} style={{ border: "1px solid #8b5cf6", borderRadius: 10, padding: "10px 14px", background: "#171127", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{youtubeLoading ? "Opening…" : "Connect YouTube"}</button></div>}
          <div style={{ marginTop: 10, fontSize: 12, opacity: .45 }}>No refresh token is shown to the browser. Live event creation and stream provisioning will use this connection in the next production slice.</div>
        </section>

        <section style={{ marginTop: 18, border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}><div><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>Broadcast destinations</div><h2 style={{ margin: "5px 0 0", fontSize: 22 }}>Where this tournament goes live</h2></div><span style={{ fontSize: 12, opacity: .5 }}>{destinations.length} configured</span></div>
          {destinations.length > 0 && <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>{destinations.map((destination) => <div key={destination.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid #242936", borderRadius: 12, padding: "12px 14px", background: "#101219" }}><div><strong>{destination.label}</strong><div style={{ fontSize: 12, opacity: .5, marginTop: 3 }}>{destination.provider.toUpperCase()} · {destination.channelName || destination.streamUrl || "Not connected"}</div></div><button onClick={() => removeDestination(destination.id)} style={{ border: "1px solid #343946", borderRadius: 9, padding: "7px 10px", background: "transparent", color: "#fff", cursor: "pointer" }}>Remove</button></div>)}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 1.5fr auto", gap: 8 }}><select value={provider} onChange={(event) => setProvider(event.target.value as BroadcastDestinationProvider)} style={fieldStyle}><option value="youtube">YouTube</option><option value="twitch">Twitch</option><option value="rtmp">Custom RTMP</option></select><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Destination label" style={fieldStyle} /><input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Channel name (optional)" style={fieldStyle} /><input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder={provider === "rtmp" ? "rtmp://…" : "Stream URL (optional until connected)"} style={fieldStyle} /><button disabled={savingDestination || !label.trim()} onClick={addDestination} style={{ border: "1px solid #8b5cf6", borderRadius: 10, padding: "0 16px", background: "#171127", color: "#fff", fontWeight: 700, cursor: savingDestination ? "wait" : "pointer" }}>{savingDestination ? "Saving…" : "Add"}</button></div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: .45 }}>Destinations remain operator-managed. Provider credentials are kept server-side; the manual RTMP/OBS path stays available as a fallback.</div>
        </section>
      </div>
    </main>
  );
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #292e39", borderRadius: 10, padding: "11px 12px", background: "#101219", color: "#fff", outline: "none" };
