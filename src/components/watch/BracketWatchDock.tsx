"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { YouTubePlayer } from "./YouTubePlayer";

const DOCK_MARGIN = 16; // matches the default bottom-4/right-4 offset

export type DockMatch = {
  id: string;
  round: string | null;
  status: string;
  playerOneScore: number;
  playerTwoScore: number;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  youtubeVideoId: string | null;
  station: {
    id: string;
    label: string;
  } | null;
};

// The "watch whichever bracket match you clicked" surface. Deliberately a
// small persistent panel rather than a full-page navigation: every
// station is already streaming independently regardless of what's
// selected here (see StreamingArchitecture), so switching matches is just
// swapping this panel's source — the rest of the bracket stays on screen
// and clickable the whole time, same as a Twitch/YouTube mini-player.
export function BracketWatchDock({
  match,
  onClose,
}: {
  match: DockMatch | null;
  onClose: () => void;
}) {
  const [minimized, setMinimized] = useState(false);

  // Undocked position, in px from the top-left, once the viewer has
  // dragged it at least once. Null means "use the default bottom-right
  // corner" (via className) rather than tracking a redundant initial
  // pixel position that would just go stale on window resize.
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  function clampToViewport(x: number, y: number) {
    const el = dockRef.current;
    const w = el?.offsetWidth ?? 360;
    const h = el?.offsetHeight ?? 240;
    const maxX = window.innerWidth - w - DOCK_MARGIN;
    const maxY = window.innerHeight - h - DOCK_MARGIN;
    return {
      x: Math.min(Math.max(x, DOCK_MARGIN), Math.max(maxX, DOCK_MARGIN)),
      y: Math.min(Math.max(y, DOCK_MARGIN), Math.max(maxY, DOCK_MARGIN)),
    };
  }

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Ignore drags started on the header's own buttons (minimize/expand/
    // close) so they still just click instead of dragging one pixel and
    // suppressing the click.
    if ((e.target as HTMLElement).closest("button, a")) return;

    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setPosition(clampToViewport(e.clientX - drag.offsetX, e.clientY - drag.offsetY));
  }

  function handleHeaderPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === e.pointerId) {
      dragState.current = null;
    }
  }

  // If the window shrinks (e.g. rotating a tablet) after a manual drag,
  // pull the dock back on-screen rather than letting it hang off the edge.
  useEffect(() => {
    function handleResize() {
      setPosition((p) => (p ? clampToViewport(p.x, p.y) : p));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!match) return null;

  const isLive = match.status === "LIVE";
  const videoId = match.youtubeVideoId ?? null;

  return (
    <div
      ref={dockRef}
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
      className={`fixed bottom-4 right-4 z-50 overflow-hidden rounded-card border border-arena-600 bg-arena-900 shadow-2xl transition-[width] ${
        minimized ? "w-[min(16rem,calc(100vw-2rem))]" : "w-[min(360px,calc(100vw-2rem))]"
      }`}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        className="flex cursor-move touch-none select-none items-center justify-between border-b border-arena-700 bg-arena-800 px-3 py-1.5"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {isLive && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-live animate-live-pulse" />
          )}
          <span className="truncate font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            {match.station?.label ?? "Not on station"}
            {match.round ? ` · ${match.round}` : ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            className="rounded px-1.5 py-0.5 text-xs text-ink-faint hover:bg-arena-700 hover:text-ink"
            aria-label={minimized ? "Expand preview" : "Minimize preview"}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? "▢" : "—"}
          </button>
          <Link
            href={`/watch/${match.id}`}
            className="rounded px-1.5 py-0.5 text-xs text-ink-faint hover:bg-arena-700 hover:text-ink"
            aria-label="Open full page"
            title="Open full page"
          >
            ⤢
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1.5 py-0.5 text-xs text-ink-faint hover:bg-arena-700 hover:text-ink"
            aria-label="Close preview"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {match.station ? (
            <YouTubePlayer key={match.id} stationId={match.station.id} videoId={videoId} isLive={isLive} />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-arena-950 px-4 text-center text-xs text-ink-faint">
              <span>{isLive ? "Waiting for YouTube Live…" : "Not live yet"}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 truncate border-l-2 border-corner-p1 pl-2 font-display uppercase tracking-wide">
              {match.playerOne.gamertag}
            </span>
            <span className="shrink-0 font-mono text-ink-muted">
              {match.playerOneScore}–{match.playerTwoScore}
            </span>
            <span className="min-w-0 truncate border-r-2 border-corner-p2 pr-2 text-right font-display uppercase tracking-wide">
              {match.playerTwo.gamertag}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
