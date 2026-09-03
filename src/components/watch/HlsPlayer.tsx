"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export function HlsPlayer({
  src,
  muted = false,
  autoPlay = true,
  className = "",
}: {
  src: string;
  muted?: boolean;
  autoPlay?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);

  const retry = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(false);
    retryCountRef.current = 0;

    if (hlsRef.current) {
      hlsRef.current.startLoad();
      void video.play().catch(() => undefined);
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.load();
      if (autoPlay) void video.play().catch(() => undefined);
      return;
    }
  }, [autoPlay, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let disposed = false;
    let hls: Hls | null = null;
    setError(false);
    setPlaying(false);
    retryCountRef.current = 0;

    const scheduleRecovery = () => {
      if (disposed || retryTimerRef.current) return;
      const attempt = retryCountRef.current++;
      const delay = Math.min(1000 * 2 ** attempt, 10000);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        if (disposed) return;
        if (hlsRef.current) {
          hlsRef.current.startLoad();
          return;
        }
        setError(true);
      }, delay);
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      if (autoPlay) void video.play().catch(() => undefined);
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        retryCountRef.current = 0;
        if (autoPlay) void video.play().catch(() => undefined);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (disposed || !data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          scheduleRecovery();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          retryCountRef.current = 0;
          hls?.recoverMediaError();
        } else {
          scheduleRecovery();
        }
      });
    } else {
      setError(true);
    }

    const onPlaying = () => {
      retryCountRef.current = 0;
      setPlaying(true);
      setError(false);
    };
    const onWaiting = () => setPlaying(false);
    const onVideoError = () => setError(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && hlsRef.current) {
        hlsRef.current.startLoad();
      }
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onVideoError);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onVideoError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      hls?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [autoPlay, src]);

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-card bg-arena-900 ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls
        className="h-full w-full object-contain"
        onError={() => setError(true)}
      />
      {!playing && !error && autoPlay && (
        <button
          type="button"
          onClick={() => void videoRef.current?.play().catch(() => undefined)}
          className="absolute inset-x-3 bottom-3 rounded bg-arena-950/85 px-3 py-2 text-xs text-ink-muted backdrop-blur"
        >
          Tap to resume live playback
        </button>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-arena-950/90 px-4 text-center text-xs text-ink-muted">
          <span>Live stream playback is temporarily unavailable.</span>
          <button
            type="button"
            onClick={retry}
            className="rounded border border-ink-faint/30 px-3 py-1.5 text-ink hover:bg-arena-800"
          >
            Retry stream
          </button>
        </div>
      )}
    </div>
  );
}
