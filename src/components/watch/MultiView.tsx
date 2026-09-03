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

  const sources = useMemo(
    () => visible.map((station) => ({ station, hlsUrl: buildHlsUrl(station.hlsPlaylistKey) })),
    [visible],
  );

  return (
    <div className={`grid gap-2 ${gridClass}`}>
      {sources.map(({ station, hlsUrl }, i) => {
        const muted = i !== audioFocus;
        return (
          <div key={station.id} className="relative">
            {hlsUrl ? (
              <HlsPlayer src={hlsUrl} muted={muted} />
            ) : station.youtubeVideoId ? (
              <YouTubePlayer stationId={station.id} videoId={station.youtubeVideoId} isLive muted={muted} />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-card bg-arena-900 text-xs text-ink-faint">
                {station.label} — offline
              </div>
            )}
            <button
              type="button"
              onClick={() => setAudioFocus(i)}
              aria-pressed={!muted}
              className="absolute left-2 top-2 rounded bg-arena-950/85 px-2 py-1 font-mono text-[10px] uppercase text-ink-muted backdrop-blur"
            >
              {station.label} · {muted ? "Audio off" : "Audio focus"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
