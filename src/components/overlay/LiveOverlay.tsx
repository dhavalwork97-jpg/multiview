"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

type OverlayData = Record<string, unknown>;

type Props = {
  tournamentId: string;
  tournamentName: string;
  organizationName: string;
  accent: string;
  initialOverlay: OverlayData;
  initialPlayerOne: string | null;
  initialPlayerTwo: string | null;
};

export function LiveOverlay({
  tournamentId,
  tournamentName,
  organizationName,
  accent,
  initialOverlay,
  initialPlayerOne,
  initialPlayerTwo,
}: Props) {
  const [overlay, setOverlay] = useState(initialOverlay);
  const socket = useSocket({ tournamentId });

  useEffect(() => {
    function onBroadcastUpdate(event: {
      overlay: OverlayData | null;
    }) {
      if (event.overlay) {
        setOverlay(event.overlay);
      }
    }

    socket.on("broadcast:updated", onBroadcastUpdate);

    return () => {
      socket.off("broadcast:updated", onBroadcastUpdate);
    };
  }, [socket]);

  const title =
    typeof overlay.title === "string" && overlay.title.trim()
      ? overlay.title
      : tournamentName;

  const sponsor =
    typeof overlay.sponsor === "string" ? overlay.sponsor : "";

  const message =
    typeof overlay.message === "string" ? overlay.message : "";

  return (
    <main
      className="min-h-screen bg-transparent p-10 text-white"
      style={{ ["--overlay-accent" as string]: accent }}
    >
      <div className="flex min-h-screen flex-col justify-between">
        <div className="flex items-start justify-between">
          <div
            className="border-l-4 bg-black/75 px-6 py-4 backdrop-blur-sm"
            style={{ borderColor: "var(--overlay-accent)" }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
              {organizationName}
            </p>
            <h1 className="mt-1 font-display text-3xl uppercase tracking-wide">
              {title}
            </h1>
            {message && (
              <p className="mt-2 text-sm text-white/75">{message}</p>
            )}
          </div>

          {sponsor && (
            <div className="bg-black/75 px-5 py-3 font-mono text-xs uppercase tracking-widest backdrop-blur-sm">
              Presented by{" "}
              <span style={{ color: "var(--overlay-accent)" }}>
                {sponsor}
              </span>
            </div>
          )}
        </div>

        {initialPlayerOne && initialPlayerTwo && (
          <div className="mx-auto bg-black/85 px-8 py-4 text-center backdrop-blur-sm">
            <div className="flex items-center gap-6 font-display text-2xl uppercase">
              <span>{initialPlayerOne}</span>
              <span className="font-mono text-sm text-white/50">VS</span>
              <span>{initialPlayerTwo}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
