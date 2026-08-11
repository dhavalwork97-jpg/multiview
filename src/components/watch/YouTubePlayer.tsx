"use client";

import { useEffect, useState } from "react";

export function YouTubePlayer({ stationId, videoId, isLive, muted = false }: { stationId: string; videoId: string | null; isLive: boolean; muted?: boolean }) {
  const [currentVideoId, setCurrentVideoId] = useState(videoId);
  const [status, setStatus] = useState(isLive ? "checking" : "offline");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/stations/${stationId}/youtube-status`, { cache: "no-store" });
        if (!res.ok) throw new Error("status request failed");
        const data = await res.json();
        if (cancelled) return;
        setCurrentVideoId(data.videoId ?? null);
        setStatus(data.isLive ? "live" : data.broadcastStatus === "liveStarting" || data.streamStatus === "active" ? "starting" : "offline");
      } catch {
        if (!cancelled) setStatus(isLive ? "checking" : "offline");
      }
    }
    poll();
    const timer = setInterval(poll, 6000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [stationId, isLive]);

  if (status === "live" && currentVideoId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-card bg-arena-900">
        <iframe
          key={currentVideoId}
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(currentVideoId)}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&playsinline=1`}
          title="FGC Stream live match"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-900 text-sm text-ink-muted">
      {status === "starting" || status === "checking" ? "Connecting to live stream…" : "Not live yet"}
    </div>
  );
}
