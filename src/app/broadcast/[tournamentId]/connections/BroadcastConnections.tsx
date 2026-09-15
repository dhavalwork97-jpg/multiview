"use client";

import { useEffect, useState } from "react";

type Destination = { id: string; provider: string; label: string; channelName?: string; streamUrl?: string };
type YouTubeConnection = {
  connected: true;
  channelName?: string;
  connectedAt: string;
  broadcast?: { status?: string; videoId?: string };
} | null;

type Props = { tournamentId: string };

export default function BroadcastConnections({ tournamentId }: Props) {
  const [youtube, setYoutube] = useState<YouTubeConnection>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [label, setLabel] = useState("");
  const [channelName, setChannelName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [destinationsResponse, youtubeResponse] = await Promise.all([
        fetch(`/api/broadcast/destinations?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
        fetch(`/api/broadcast/youtube/status?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
      ]);
      const destinationsData = await destinationsResponse.json();
      const youtubeData = await youtubeResponse.json();
      if (!destinationsResponse.ok) throw new Error(destinationsData.error ?? "Could not load destinations");
      if (!youtubeResponse.ok) throw new Error(youtubeData.error ?? "Could not load YouTube connection");
      setDestinations(destinationsData.destinations ?? []);
      setYoutube(youtubeData.connection ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load broadcast connections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [tournamentId]);

  function connectYouTube() {
    window.location.href = `/api/broadcast/youtube/connect?tournamentId=${encodeURIComponent(tournamentId)}`;
  }

  async function connectRtmp() {
    setError("");
    setMessage("");
    if (!label.trim() || !streamUrl.trim() || !streamKey.trim()) {
      setError("Enter a service name, RTMP server URL, and stream key.");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch("/api/broadcast/destinations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          provider: "rtmp",
          label: label.trim(),
          channelName: channelName.trim(),
          streamUrl: streamUrl.trim(),
          streamKey: streamKey.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not connect the RTMP destination");
      setDestinations(data.destinations ?? []);
      setLabel("");
      setChannelName("");
      setStreamUrl("");
      setStreamKey("");
      setMessage("Streaming destination connected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect the RTMP destination");
    } finally {
      setWorking(false);
    }
  }

  async function removeDestination(destinationId: string) {
    setError("");
    const response = await fetch("/api/broadcast/destinations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tournamentId, destinationId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not disconnect destination");
      return;
    }
    setDestinations(data.destinations ?? []);
    setMessage("Streaming destination disconnected.");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <a href={`/broadcast/${tournamentId}/control-room`} style={{ color: "#aaa5bb", fontSize: 13, textDecoration: "none" }}>← Back to Control Room</a>
        <header style={{ margin: "28px 0" }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", opacity: .5 }}>FGC Stream</div>
          <h1 style={{ margin: "8px 0 10px", fontSize: 36 }}>Connect your broadcast</h1>
          <p style={{ margin: 0, maxWidth: 680, color: "#9b9eaa", lineHeight: 1.6 }}>Connect where your tournament should stream. You only need to authorize YouTube or enter the RTMP details your streaming service gives you.</p>
        </header>

        {error && <div role="alert" style={{ marginBottom: 14, border: "1px solid #5b2a35", background: "#1b0e13", borderRadius: 12, padding: 13, color: "#ffb7c2" }}>{error}</div>}
        {message && <div role="status" style={{ marginBottom: 14, border: "1px solid #294a36", background: "#0d1711", borderRadius: 12, padding: 13, color: "#bde8c9" }}>{message}</div>}

        <section style={cardStyle}>
          <div style={providerHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Recommended</div>
              <h2 style={titleStyle}>YouTube</h2>
              <p style={descriptionStyle}>Click connect, approve the Google permissions, and FGC Stream will handle the YouTube setup.</p>
            </div>
            {loading ? <span style={pillStyle}>Checking…</span> : youtube ? <span style={connectedPillStyle}>Connected</span> : <span style={pillStyle}>Not connected</span>}
          </div>
          {youtube ? (
            <div style={connectedRowStyle}>
              <div><strong>{youtube.channelName || "YouTube channel"}</strong><div style={smallStyle}>Your channel is connected to this tournament.</div></div>
              <button onClick={connectYouTube} style={secondaryButtonStyle}>Reconnect</button>
            </div>
          ) : (
            <button disabled={loading} onClick={connectYouTube} style={primaryButtonStyle}>Connect YouTube</button>
          )}
        </section>

        <section style={cardStyle}>
          <div style={providerHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Kick, Twitch, or any RTMP service</div>
              <h2 style={titleStyle}>Custom RTMP</h2>
              <p style={descriptionStyle}>Use the RTMP server URL and stream key provided by your streaming service. FGC Stream stores the key securely and never shows it back.</p>
            </div>
            <span style={pillStyle}>Connect</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Service name" value={label} onChange={setLabel} placeholder="Kick" />
            <Field label="Channel name (optional)" value={channelName} onChange={setChannelName} placeholder="My tournament channel" />
            <Field label="RTMP server URL" value={streamUrl} onChange={setStreamUrl} placeholder="rtmp://…" />
            <Field label="Stream key" value={streamKey} onChange={setStreamKey} placeholder="Paste your stream key" type="password" />
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button disabled={working} onClick={connectRtmp} style={primaryButtonStyle}>{working ? "Connecting…" : "Connect RTMP"}</button>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={providerHeaderStyle}><div><div style={eyebrowStyle}>Already connected</div><h2 style={titleStyle}>Your streaming destinations</h2></div><span style={pillStyle}>{destinations.length} RTMP</span></div>
          {destinations.length === 0 ? <div style={{ color: "#777b88", fontSize: 13 }}>No custom RTMP destinations yet.</div> : <div style={{ display: "grid", gap: 8 }}>{destinations.map((destination) => <div key={destination.id} style={connectedRowStyle}><div><strong>{destination.label}</strong><div style={smallStyle}>{destination.channelName || destination.streamUrl || "RTMP destination"} · Stream key saved securely</div></div><button onClick={() => removeDestination(destination.id)} style={secondaryButtonStyle}>Disconnect</button></div>)}</div>}
        </section>

        <p style={{ color: "#656977", fontSize: 12, lineHeight: 1.6, marginTop: 18 }}>You never need to enter Google Cloud, KMS, Vercel, or application credentials here. FGC Stream handles the platform-side security and provider authorization. Your encoder or OBS still sends the actual video stream.</p>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label style={{ color: "#b6b8c2", fontSize: 12 }}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ ...fieldStyle, display: "block", marginTop: 6, width: "100%", boxSizing: "border-box" }} /></label>;
}

const cardStyle = { border: "1px solid #222631", borderRadius: 20, background: "#0c0e14", padding: 22, marginBottom: 14 };
const providerHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, marginBottom: 18 };
const eyebrowStyle = { fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const, opacity: .45 };
const titleStyle = { margin: "6px 0 0", fontSize: 21 };
const descriptionStyle = { margin: "8px 0 0", color: "#858895", fontSize: 13, lineHeight: 1.55, maxWidth: 680 };
const smallStyle = { marginTop: 5, color: "#777b88", fontSize: 12 };
const pillStyle = { border: "1px solid #292e39", borderRadius: 999, padding: "7px 10px", fontSize: 11, color: "#9a9daa", whiteSpace: "nowrap" as const };
const connectedPillStyle = { ...pillStyle, borderColor: "#31533b", color: "#b8e6c3", background: "#0e1510" };
const connectedRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, border: "1px solid #242936", borderRadius: 12, padding: "13px 14px", background: "#101219" };
const fieldStyle = { border: "1px solid #2a2e39", borderRadius: 10, background: "#101219", color: "#fff", padding: "11px 12px", outline: "none" };
const primaryButtonStyle = { border: "1px solid #8b5cf6", borderRadius: 10, padding: "11px 15px", background: "#6d28d9", color: "#fff", fontWeight: 700, cursor: "pointer" };
const secondaryButtonStyle = { border: "1px solid #303541", borderRadius: 10, padding: "10px 13px", background: "#11141b", color: "#e6e7ed", cursor: "pointer" };
