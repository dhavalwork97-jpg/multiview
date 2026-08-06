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

  useEffect(() => {
    let room: Room | null = null;
    let cancelled = false;

    async function connect() {
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
  }, [stationId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card bg-arena-900">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full" />
      {status === "connecting" && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
          Connecting…
        </p>
      )}
      {status === "error" && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-signal-error">
          Couldn't connect to the low-latency stream.
        </p>
      )}
    </div>
  );
}
