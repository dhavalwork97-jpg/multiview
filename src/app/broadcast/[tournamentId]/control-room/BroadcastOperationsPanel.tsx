"use client";

import { useEffect, useState } from "react";

type Props = { tournamentId: string };
type Destination = { id: string; provider: string; label: string };
type YouTubeConnection = {
  connected: true;
  channelName?: string;
  broadcast?: { status?: string; videoId?: string };
} | null;

export default function BroadcastOperationsPanel({ tournamentId }: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [youtube, setYoutube] = useState<YouTubeConnection>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [destinationsResponse, youtubeResponse] = await Promise.all([
          fetch(`/api/broadcast/destinations?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
          fetch(`/api/broadcast/youtube/status?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" }),
        ]);
        if (!cancelled && destinationsResponse.ok && youtubeResponse.ok) {
          const destinationsData = await destinationsResponse.json();
          const youtubeData = await youtubeResponse.json();
          setDestinations(destinationsData.destinations ?? []);
          setYoutube(youtubeData.connection ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [tournamentId]);

  const eventStatus = youtube?.broadcast?.status
    ? youtube.broadcast.status.replaceAll("-", " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase())
    : youtube
      ? "Channel connected"
      : "Not connected";

  return (
    <section style={{ marginBottom: 18, border: "1px solid #252936", borderRadius: 20, background: "linear-gradient(145deg,#10131b,#0a0c11)", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".15em", opacity: .45, textTransform: "uppercase" }}>Broadcast Operations</div>
          <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Broadcast status</h2>
        </div>
        <a href={`/broadcast/${tournamentId}`} style={{ color: "#c4b5fd", textDecoration: "none", fontSize: 11, letterSpacing: ".1em" }}>OPEN BROADCAST CONSOLE →</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
        <StatusCard title="YouTube" value={loading ? "Loading…" : youtube ? `Connected${youtube.channelName ? ` · ${youtube.channelName}` : ""}` : "Not connected"} detail={youtube?.broadcast?.videoId ? "Live event has a watch page" : "Channel connection status"} />
        <StatusCard title="Live event" value={loading ? "Loading…" : eventStatus} detail={youtube?.broadcast ? "Event exists in YouTube" : "No YouTube event prepared"} />
        <StatusCard title="Destinations" value={loading ? "Loading…" : `${destinations.length + (youtube ? 1 : 0)} configured`} detail="YouTube plus configured RTMP destinations" />
      </div>
    </section>
  );
}

function StatusCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div style={{ border: "1px solid #242936", borderRadius: 12, padding: 13, background: "#0d1016", minWidth: 0 }}>
      <div style={{ fontSize: 10, letterSpacing: ".12em", opacity: .42, textTransform: "uppercase" }}>{title}</div>
      <div style={{ marginTop: 7, fontSize: 14, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ marginTop: 5, fontSize: 11, opacity: .45 }}>{detail}</div>
    </div>
  );
}
