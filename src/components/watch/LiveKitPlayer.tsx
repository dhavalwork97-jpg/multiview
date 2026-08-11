"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";

export function LiveKitPlayer({ stationId }: { stationId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let room: Room | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function connect() {
      if (cancelled) return;
      setStatus("connecting");
      try {
        const res = await fetch(`/api/stations/${stationId}/token`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Playback token request failed (${res.status})`);
        const { token, wsUrl } = await res.json();
        if (!token || !wsUrl) throw new Error("LiveKit token response is incomplete");

        room = new Room();
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if ((track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) && videoRef.current) {
            track.attach(videoRef.current);
          }
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) {
            setStatus("connecting");
            retryTimer = setTimeout(connect, 1500);
          }
        });

        await room.connect(wsUrl, token);
        if (cancelled) {
          room.disconnect();
          return;
        }

        attempts = 0;
        setStatus("connected");

        // Tracks may already have been published before the viewer joined.
        // Attach existing subscribed publications as a safety net.
        for (const publication of room.remoteParticipants.values()) {
          for (const pub of publication.trackPublications.values()) {
            const track = pub.track;
            if (track && (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) && videoRef.current) {
              track.attach(videoRef.current);
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        attempts += 1;
        // Keep trying during the normal OBS/LiveKit startup window. After
        // several attempts, show the manual Retry control but continue a
        // slower background retry so a transient startup race can recover.
        setStatus("error");
        const delay = attempts < 6 ? 1500 : 5000;
        retryTimer = setTimeout(connect, delay);
        console.warn("[LiveKitPlayer] connection attempt failed:", err);
      }
    }

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      room?.disconnect();
    };
  }, [stationId, retryNonce]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card bg-arena-900">
      <video ref={videoRef} autoPlay playsInline controls className="h-full w-full" />
      {status === "connecting" && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
          Connecting to live stream…
        </p>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-arena-900/95 text-center text-sm text-signal-error">
          <p>Couldn't connect to the low-latency stream yet.</p>
          <p className="text-xs text-ink-faint">Retrying automatically…</p>
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="rounded-card border border-arena-600 px-3 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live"
          >
            Retry now
          </button>
        </div>
      )}
    </div>
  );
}
