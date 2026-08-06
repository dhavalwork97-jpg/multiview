"use client";

import { useState } from "react";

// "Instant replay" is really just a clip request pre-filled with the last
// 30 seconds relative to elapsedSeconds (how far into the match the
// viewer currently is) — no separate code path from manual clipping.
export function ClipControls({
  matchId,
  elapsedSeconds,
}: {
  matchId: string;
  elapsedSeconds: number;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "queued" | "error">("idle");

  async function requestClip(startSeconds: number, endSeconds: number) {
    setStatus("submitting");
    try {
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, startSeconds, endSeconds }),
      });
      if (!res.ok) throw new Error();
      setStatus("queued");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={status === "submitting"}
        onClick={() => requestClip(Math.max(0, elapsedSeconds - 30), elapsedSeconds)}
        className="rounded border border-arena-600 px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:text-signal-live"
      >
        ⏪ Replay last 30s
      </button>
      {status === "queued" && (
        <span className="text-xs text-ink-faint">Clip queued — check the clips tab shortly</span>
      )}
      {status === "error" && <span className="text-xs text-signal-error">Couldn't queue that clip</span>}
    </div>
  );
}
