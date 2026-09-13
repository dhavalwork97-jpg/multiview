"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HlsPlayer } from "./HlsPlayer";
import { YouTubePlayer } from "./YouTubePlayer";

type MultiViewStation = { id: string; label: string; youtubeVideoId: string | null; hlsPlaylistKey: string | null };

type Props = { stations: MultiViewStation[]; layout: 4 | 9 | 16 };

function buildHlsUrl(key: string | null) {
  if (!key) return null;
  const domain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!domain) return null;
  return `https://${domain}/${key.replace(/^\/+/, "")}`;
}

export function MultiView({ stations, layout }: Props) {
  const visible = stations.slice(0, layout);
  const [audioFocus, setAudioFocus] = useState(0);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1, 2, 3].filter((i) => i < visible.length)));
  const tileRefs = useRef<Array<HTMLElement | null>>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const gridClass = layout === 4 ? "grid-cols-1 sm:grid-cols-2" : layout === 9 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  const sources = useMemo(() => visible.map((station) => ({ station, hlsUrl: buildHlsUrl(station.hlsPlaylistKey) })), [visible]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setMounted((current) => {
        const next = new Set(current);
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.stationIndex);
          if (entry.isIntersecting && Number.isFinite(index)) next.add(index);
        });
        return next.size === current.size ? current : next;
      });
    }, { rootMargin: "320px 0px", threshold: 0.01 });
    tileRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [visible.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < visible.length) {
          event.preventDefault();
          setAudioFocus(index);
          setMounted((current) => new Set(current).add(index));
        }
      }
      if (event.key.toLowerCase() === "f" && visible[audioFocus]) {
        event.preventDefault();
        const node = tileRefs.current[audioFocus];
        if (!node) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void node.requestFullscreen?.();
      }
      if (event.key === "Escape" && document.fullscreenElement) void document.exitFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioFocus, visible.length]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        <span>Keys 1–9: audio focus · F: fullscreen focused feed · Esc: exit fullscreen</span>
        <span>{visible.length} / {stations.length} feeds mounted on demand</span>
      </div>
      <div className={`ds-grid grid gap-2 bg-arena-950/70 p-1 sm:p-2 ${gridClass}`}>
        {sources.map(({ station, hlsUrl }, i) => {
          const muted = i !== audioFocus;
          const focused = i === audioFocus;
          const isMounted = mounted.has(i) || focused;
          return (
            <article
              key={station.id}
              ref={(node) => { tileRefs.current[i] = node; }}
              data-station-index={i}
              tabIndex={0}
              onDoubleClick={() => { setAudioFocus(i); const node = tileRefs.current[i]; if (node) void node.requestFullscreen?.(); }}
              className={`stream-tile outline-none ${focused ? "stream-tile-active ring-1 ring-violet-500/70" : ""}`}
            >
              <div className="stream-tile-label">
                <span className="flex min-w-0 items-center gap-2"><span className={focused ? "live-dot" : "h-1.5 w-1.5 rounded-full bg-arena-500"} /><span className="truncate">{station.label}</span></span>
                <span>{focused ? "AUDIO FOCUS" : "MONITOR"}</span>
              </div>
              {isMounted ? (hlsUrl ? <HlsPlayer src={hlsUrl} muted={muted} /> : station.youtubeVideoId ? <YouTubePlayer stationId={station.id} videoId={station.youtubeVideoId} isLive muted={muted} /> : <div className="flex aspect-video items-center justify-center bg-arena-900 text-xs text-ink-faint">{station.label} — offline</div>) : <div className="flex aspect-video items-center justify-center bg-arena-950 text-[10px] uppercase tracking-widest text-ink-faint">Feed paused until visible</div>}
              <div className="flex items-center justify-between gap-2 border-t border-arena-800 bg-arena-950/90 px-2.5 py-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Station {String(i + 1).padStart(2, "0")}</span>
                <button type="button" onClick={() => { setAudioFocus(i); setMounted((current) => new Set(current).add(i)); }} aria-pressed={focused} className={focused ? "action-primary min-h-8 px-2.5" : "action-ghost min-h-8 px-2.5"}>{focused ? "Audio focused" : "Focus audio"}</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
