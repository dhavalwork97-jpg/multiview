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
type YouTubeConnection = { connected: true; channelId?: string; channelName?: string; connectedAt: string; broadcast?: { broadcastId: string; streamId: string; streamName?: string; videoId?: string; status?: string } } | null;

export default function BroadcastProductionConsole({ params }: BroadcastPageProps) {
  const [active, setActive] = useState<BroadcastScene>("gameplay");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<BroadcastDestination[]>([]);
  const [provider, setProvider] = useState<BroadcastDestinationProvider>("rtmp");
  const [label, setLabel] = useState("");
  const [channelName, setChannelName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [savingDestination, setSavingDestination] = useState(false);
  const [youtubeConnection, setYoutubeConnection] = useState<YouTubeConnection>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeAction, setYoutubeAction] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState("");

  useEffect(() => {
    let mounted = true;
    void params.then(({ tournamentId: id }) => { if (mounted) setTournamentId(id); });
    return () => { mounted = false; };
  }, [params]);

  async function loadBroadcastConfig(id: string) {
    const [destinationResponse, youtubeResponse] = await Promise.all([
      fetch(`/api/broadcast/destinations?tournamentId=${encodeURIComponent(id)}`),
      fetch(`/api/broadcast/youtube/status?tournamentId=${encodeURIComponent(id)}`),
    ]);
    if (!destinationResponse.ok || !youtubeResponse.ok) throw new Error("Could not load broadcast configuration");
    const [destinationData, youtubeData] = await Promise.all([destinationResponse.json(), youtubeResponse.json()]);
    setDestinations(destinationData.destinations ?? []);
    setYoutubeConnection(youtubeData.connection ?? null);
  }

  useEffect(() => {
    if (!tournamentId) return;
    void loadBroadcastConfig(tournamentId).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load broadcast configuration"));
  }, [tournamentId]);

  const groups = useMemo(() => [SCENES.slice(0, 4), SCENES.slice(4)], []);
  const youtubeStatus = youtubeConnection?.broadcast?.status ?? "not-created";
  const youtubeWatchUrl = youtubeConnection?.broadcast?.videoId ? `https://www.youtube.com/watch?v=${youtubeConnection.broadcast.videoId}` : null;
  const destinationCount = destinations.length + (youtubeConnection ? 1 : 0);
  const broadcastStatus = youtubeConnection?.broadcast ? youtubeStatus : youtubeConnection ? "channel-connected" : "not-connected";
  const broadcastStatusLabel = youtubeConnection?.broadcast
    ? youtubeStatus.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : youtubeConnection ? "Channel connected" : "Not connected";

  async function send(scene: BroadcastScene, type: BroadcastCommandType) {
    if (!tournamentId) return;
    setBusy(true);
    setMessage(`Sending ${scene}…`);
    try {
      const response = await fetch("/api/broadcast/command", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, scene, type }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Command failed");
      setActive(scene);
      setMessage(`Program: ${scene}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Command failed"); }
    finally { setBusy(false); }
  }

  function connectYouTube() {
    if (!tournamentId) return;
    setYoutubeLoading(true);
    setMessage("Opening YouTube authorization…");
    window.location.href = `/api/broadcast/youtube/connect?tournamentId=${encodeURIComponent(tournamentId)}`;
  }

  async function youtubeLiveAction(action: "create" | "testing" | "live" | "complete") {
    if (!tournamentId || !youtubeConnection) return;
    setYoutubeAction(action);
    setMessage(action === "create" ? "Creating YouTube event…" : `Moving YouTube event to ${action}…`);
    try {
      const response = await fetch("/api/broadcast/youtube/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, action, ...(action === "create" ? { title: youtubeTitle.trim() || "FGC Stream Live", privacyStatus: "unlisted" } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "YouTube action failed");
      await loadBroadcastConfig(tournamentId);
      setMessage(action === "create" ? "YouTube event created — send the stream from your encoder" : `YouTube: ${action}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "YouTube action failed"); }
    finally { setYoutubeAction(null); }
  }

  async function addDestination() {
    if (!tournamentId || !label.trim()) return;
    setSavingDestination(true);
    setMessage("Saving broadcast destination…");
    try {
      const response = await fetch("/api/broadcast/destinations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, provider, label, channelName, streamUrl, ...(provider === "rtmp" ? { streamKey } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save destination");
      setDestinations(data.destinations ?? []); setLabel(""); setChannelName(""); setStreamUrl(""); setStreamKey(""); setMessage("Destination saved");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save destination"); }
    finally { setSavingDestination(false); }
  }

  async function removeDestination(destinationId: string) {
    if (!tournamentId) return;
    const response = await fetch("/api/broadcast/destinations", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, destinationId }) });
    const data = await response.json();
    if (response.ok) setDestinations(data.destinations ?? []); else setMessage(data.error ?? "Could not remove destination");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, marginBottom: 28 }}><div><div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", opacity: .55 }}>FGC Broadcast Studio</div><h1 style={{ margin: "8px 0 0", fontSize: 36, lineHeight: 1 }}>Production Console</h1></div><div style={{ padding: "10px 14px", border: "1px solid #252936", borderRadius: 999, fontSize: 13, background: "#0d0f16" }}>● LIVE · {message}</div></header>

        <section style={{ marginBottom: 18, border: "1px solid #222631", borderRadius: 20, background: "linear-gradient(145deg,#10131b,#0a0c11)", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>Broadcast operations</div><h2 style={{ margin: "5px 0 0", fontSize: 22 }}>Live broadcast status</h2></div>
            <span style={{ border: "1px solid #292e39", borderRadius: 999, padding: "7px 11px", fontSize: 12, background: "#0d1016" }}>{broadcastStatusLabel}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div style={statusCardStyle}><div style={eyebrowStyle}>Destination</div><strong>{youtubeConnection ? `YouTube · ${youtubeConnection.channelName || "Connected channel"}` : "No YouTube channel"}</strong><div style={mutedStyle}>{destinationCount} configured destination{destinationCount === 1 ? "" : "s"}</div></div>
            <div style={statusCardStyle}><div style={eyebrowStyle}>Live event</div><strong>{youtubeConnection?.broadcast ? "YouTube event created" : "No event prepared"}</strong><div style={mutedStyle}>{youtubeConnection?.broadcast?.videoId ? "Watch page available" : "Prepare an event below"}</div></div>
            <div style={statusCardStyle}><div style={eyebrowStyle}>Encoder / ingest</div><strong>External encoder</strong><div style={mutedStyle}>Health is only shown when the connected provider reports it; no synthetic metrics.</div></div>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, opacity: .5 }}>Broadcast automation sits above the existing Program/Preview controls. Nothing in the production scene workflow has been removed.</div>
            {youtubeConnection?.broadcast && youtubeWatchUrl && <a href={youtubeWatchUrl} target="_blank" rel="noreferrer" style={{ color: "#c4b5fd", fontSize: 13 }}>Open watch page ↗</a>}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 18 }}><div style={{ border: "1px solid #222631", borderRadius: 20, background: "linear-gradient(145deg,#10131b,#090a10)", padding: 22 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><span style={{ fontSize: 13, opacity: .55 }}>PROGRAM</span><strong style={{ color: "#9f7aea" }}>{active.toUpperCase()}</strong></div><div style={{ aspectRatio: "16/9", borderRadius: 14, border: "1px solid #292d39", display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 40%,#24183b 0,#0b0c12 55%)", overflow: "hidden" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 12, letterSpacing: ".2em", opacity: .45 }}>FGC LIVE</div><div style={{ fontSize: 52, fontWeight: 800, textTransform: "uppercase", marginTop: 8 }}>{active.replaceAll("-", " ")}</div><div style={{ marginTop: 12, opacity: .5, fontSize: 13 }}>OBS Browser Source · Realtime</div></div></div></div><aside style={{ display: "grid", gap: 12 }}>{groups.map((group, index) => <div key={index} style={{ border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 14, display: "grid", gap: 10 }}>{group.map((item) => <button key={item.scene} disabled={busy || !tournamentId} onClick={() => send(item.scene, item.type)} style={{ textAlign: "left", border: active === item.scene ? "1px solid #8b5cf6" : "1px solid #242936", borderRadius: 12, padding: "13px 14px", background: active === item.scene ? "#171127" : "#101219", color: "#fff", cursor: busy ? "wait" : "pointer" }}><div style={{ fontWeight: 700 }}>{item.label}</div><div style={{ fontSize: 11, opacity: .45, marginTop: 3 }}>{item.type}</div></button>)}</div>)}</aside></section>
        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>{["Program", "Preview", "OBS Sync"].map((labelValue, i) => <div key={labelValue} style={{ border: "1px solid #222631", borderRadius: 16, background: "#0c0e14", padding: 16 }}><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>{labelValue}</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 750 }}>{i === 0 ? active : i === 1 ? "Standby" : "Connected"}</div></div>)}</section>
        <section style={{ marginTop: 18, border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}><div><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>YouTube</div><h2 style={{ margin: "5px 0 0", fontSize: 22 }}>Go live in a few clicks</h2></div><span style={{ fontSize: 12, opacity: .5 }}>{youtubeConnection ? youtubeStatus : "Not connected"}</span></div>
          {!youtubeConnection ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: "1px solid #242936", borderRadius: 12, padding: "14px 16px", background: "#101219" }}><div><strong>Connect your YouTube channel</strong><div style={{ fontSize: 12, opacity: .5, marginTop: 4 }}>One-time authorization. FGC Stream handles the technical YouTube setup.</div></div><button disabled={youtubeLoading || !tournamentId} onClick={connectYouTube} style={primaryButtonStyle}>{youtubeLoading ? "Opening…" : "Connect YouTube"}</button></div> : <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: "1px solid #263329", borderRadius: 12, padding: "14px 16px", background: "#0e1510" }}><div><strong>{youtubeConnection.channelName || "YouTube channel"}</strong><div style={{ fontSize: 12, opacity: .55, marginTop: 4 }}>Connected · credentials stay encrypted on the server</div></div><button disabled={youtubeLoading} onClick={connectYouTube} style={secondaryButtonStyle}>Reconnect</button></div>
            <div style={{ marginTop: 12, border: "1px solid #242936", borderRadius: 12, padding: 14, background: "#101219" }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}><label style={{ fontSize: 12, opacity: .65 }}>Event title<input value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} placeholder="FGC Stream Live" style={{ ...fieldStyle, display: "block", marginTop: 6 }} /></label><button disabled={Boolean(youtubeAction) || youtubeStatus !== "not-created"} onClick={() => youtubeLiveAction("create")} style={primaryButtonStyle}>{youtubeAction === "create" ? "Creating…" : "Create live event"}</button></div>
              {youtubeConnection.broadcast && <><div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><button disabled={Boolean(youtubeAction) || youtubeStatus !== "created"} onClick={() => youtubeLiveAction("testing")} style={stepButtonStyle}>1 · Test stream</button><button disabled={Boolean(youtubeAction) || !["ready", "testing"].includes(youtubeStatus)} onClick={() => youtubeLiveAction("live")} style={stepButtonStyle}>2 · Go live</button><button disabled={Boolean(youtubeAction) || youtubeStatus !== "live"} onClick={() => youtubeLiveAction("complete")} style={stepButtonStyle}>3 · End broadcast</button></div><div style={{ marginTop: 10, fontSize: 12, opacity: .55 }}>Send your encoder/OBS output to the stream credentials generated by FGC Stream. Once the stream is ready, use Go live here.</div>{youtubeWatchUrl && <a href={youtubeWatchUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, color: "#c4b5fd", fontSize: 13 }}>Open YouTube watch page ↗</a>}</>}
            </div></div>}
          <div style={{ marginTop: 10, fontSize: 12, opacity: .45 }}>Organizer setup stays intentionally small: connect the channel once, then create and operate each event here. Google OAuth credentials are platform configuration, not organizer configuration.</div>
        </section>
        <section style={{ marginTop: 18, border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}><div><div style={{ fontSize: 11, opacity: .45, textTransform: "uppercase", letterSpacing: ".12em" }}>Fallback destinations</div><h2 style={{ margin: "5px 0 0", fontSize: 22 }}>Optional RTMP / other outputs</h2></div><span style={{ fontSize: 12, opacity: .5 }}>{destinations.length} configured</span></div>{destinations.length > 0 && <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>{destinations.map((destination) => <div key={destination.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid #242936", borderRadius: 12, padding: "12px 14px", background: "#101219" }}><div><strong>{destination.label}</strong><div style={{ fontSize: 12, opacity: .5, marginTop: 3 }}>{destination.provider.toUpperCase()} · {destination.channelName || destination.streamUrl || "Not connected"}{destination.provider === "rtmp" ? " · Stream key saved" : ""}</div></div><button onClick={() => removeDestination(destination.id)} style={secondaryButtonStyle}>Remove</button></div>)}</div>}<div style={{ display: "grid", gridTemplateColumns: provider === "rtmp" ? "150px 1fr 1fr 1.35fr 1.35fr auto" : "150px 1fr 1fr 1.5fr auto", gap: 8, alignItems: "center" }}><select value={provider} onChange={(event) => { setProvider(event.target.value as BroadcastDestinationProvider); setStreamKey(""); }} style={fieldStyle}><option value="rtmp">Custom RTMP</option><option value="twitch">Twitch</option><option value="youtube">YouTube (advanced)</option></select><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Destination label" style={fieldStyle} /><input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Channel name (optional)" style={fieldStyle} /><input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder="rtmp://…" style={fieldStyle} />{provider === "rtmp" && <input type="password" value={streamKey} onChange={(event) => setStreamKey(event.target.value)} placeholder="Stream key" autoComplete="new-password" style={fieldStyle} />}<button disabled={savingDestination || !label.trim() || (provider === "rtmp" && (!streamUrl.trim() || !streamKey.trim()))} onClick={addDestination} style={primaryButtonStyle}>{savingDestination ? "Saving…" : "Add"}</button></div><div style={{ marginTop: 10, fontSize: 12, opacity: .45 }}>Custom RTMP requires both the ingest/server URL and stream key. The stream key is encrypted at rest and is never returned by the destinations API.</div></section>
      </div>
    </main>
  );
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #292e39", borderRadius: 10, padding: "11px 12px", background: "#101219", color: "#fff", outline: "none" };
const primaryButtonStyle = { border: "1px solid #8b5cf6", borderRadius: 10, padding: "11px 14px", background: "#171127", color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const };
const secondaryButtonStyle = { border: "1px solid #343946", borderRadius: 9, padding: "8px 12px", background: "transparent", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" as const };
const stepButtonStyle = { border: "1px solid #292e39", borderRadius: 10, padding: "11px 12px", background: "#0d1016", color: "#fff", fontWeight: 650, cursor: "pointer" };
const statusCardStyle = { border: "1px solid #242936", borderRadius: 12, padding: "14px 15px", background: "#0d1016", minHeight: 84 };
const eyebrowStyle = { fontSize: 10, opacity: .45, textTransform: "uppercase" as const, letterSpacing: ".12em", marginBottom: 7 };
const mutedStyle = { fontSize: 12, opacity: .5, marginTop: 5 };