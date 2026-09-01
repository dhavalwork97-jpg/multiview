"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MultiStageGenerator({ tournamentId, disabled = false }: { tournamentId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/stages/auto-generate`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not generate stages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate stages");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-card border border-signal-live/20 bg-signal-live/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">V31.8 Multi-stage engine</p>
          <p className="mt-1 text-sm text-ink-muted">Generate Groups → Playoffs → Grand Final with automatic qualification and match-result advancement.</p>
        </div>
        <button type="button" onClick={() => void generate()} disabled={disabled || busy} className="action-secondary disabled:opacity-40">
          {busy ? "Generating…" : "Generate stages"}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-signal-error">{error}</p>}
    </div>
  );
}
