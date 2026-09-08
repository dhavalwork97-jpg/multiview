"use client";

import { useMemo, useState } from "react";
import { HlsPlayer } from "./HlsPlayer";
import { YouTubePlayer } from "./YouTubePlayer";

type MultiViewStation = { id: string; label: string; youtubeVideoId: string | null; hlsPlaylistKey: string | null };

function buildHlsUrl(key: string | null) {
  if (!key) return null;
  const domain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!domain) return null;
  return `https://${domain}/${key.replace(/^\/+/, "")}`;
}

export function MultiView({ stations, layout }: { stations: MultiViewStation[]; layout: 4 | 9 }) {
  const visible = stations.slice(0, layout);
  const [audioFocus, setAudioFocus] = useState(0);
  const gridClass = layout === 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  const sources = useMemo(() => visible.map((station) => ({ station, hlsUrl: buildHlsUrl(station.hlsPlaylistKey) })), [visible]);

  return (
    <div className={`ds-grid grid gap-2 bg-arena-950/70 p-1 sm:p-2 ${gridClass}`}>
      {sources.map(({ station, hlsUrl }, i) => {
        const muted = i !== audioFocus;
        const focused = i === audioFocus;
        return (
          <article key={station.id} className={`stream-tile ${focused ? "stream-tile-active" : ""}`}>
            <div className="stream-tile-label">
              <span className="flex min-w-0 items-center gap-2"><span className={focused ? "live-dot" : "h-1.5 w-1.5 rounded-full bg-arena-500"} /><span className="truncate">{station.label}</span></span>
              <span>{focused ? "AUDIO FOCUS" : "MONITOR"}</span>
            </div>
            {hlsUrl ? <HlsPlayer src={hlsUrl} muted={muted} /> : station.youtubeVideoId ? <YouTubePlayer stationId={station.id} videoId={station.youtubeVideoId} isLive muted={muted} /> : <div className="flex aspect-video items-center justify-center bg-arena-900 text-xs text-ink-faint">{station.label} — offline</div>}
            <div className="flex items-center justify-between gap-2 border-t border-arena-800 bg-arena-950/90 px-2.5 py-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Station {String(i + 1).padStart(2, "0")}</span>
              <button type="button" onClick={() => setAudioFocus(i)} aria-pressed={focused} className={focused ? "action-primary min-h-8 px-2.5" : "action-ghost min-h-8 px-2.5"}>{focused ? "Audio focused" : "Focus audio"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
