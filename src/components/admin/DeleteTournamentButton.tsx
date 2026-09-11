"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTournamentButton({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function removeTournament() {
    if (busy) return;
    const confirmed = window.confirm(`Delete “${tournamentName}” permanently? This removes its matches, brackets, stations, participants, broadcast state and tournament data.`);
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to delete tournament");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete tournament");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={removeTournament}
      disabled={busy}
      className="action-secondary border-red-500/40 text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
      title="Platform admins only"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
