"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";

// Opt-in low-latency mode (see STREAMING_ARCHITECTURE.md for why this
// isn't the default). Fetches a short-lived subscribe-only token, joins
// the station's LiveKit room, and attaches whatever video/audio tracks
// the station's ingress is publishing.
export function LiveKitPlayer({ stationId }: { stationId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  // Bumping this re-runs the connect effect below — the retry affordance
  // for "token request failed" / "room disconnected unexpectedly", neither
  // of which previously had any way to recover short of navigating away
  // and back.
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let room: Room | null = null;
    let cancelled = false;

    async function connect() {
      setStatus("connecting");
      try {
        const res = await fetch(`/api/stations/${stationId}/token`);
        if (!res.ok) throw new Error("Could not get a playback token");
        const { token, wsUrl } = await res.json();

        room = new Room();
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            if (videoRef.current) track.attach(videoRef.current);
          }
        });
        // The room can drop after a successful connect (encoder crash,
        // network blip) — this used to leave `status` stuck at
        // "connected" showing a frozen last frame with no indication the
        // stream had actually died.
        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) setStatus("error");
        });

        await room.connect(wsUrl, token);
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    connect();
    return () => {
      cancelled = true;
      room?.disconnect();
    };
  }, [stationId, retryNonce]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card bg-arena-900">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full" />
      {status === "connecting" && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
          Connecting…
        </p>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-arena-900/95 text-center text-sm text-signal-error">
          <p>Couldn't connect to the low-latency stream.</p>
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="rounded-card border border-arena-600 px-3 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
