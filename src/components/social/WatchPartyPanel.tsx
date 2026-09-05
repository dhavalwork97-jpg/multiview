"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { WatchPartyProvider } from "./WatchPartyContext";

export function WatchPartyPanel({ matchId, children }: { matchId: string; children: ReactNode }) {
  const [code, setCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const inviteCode = useMemo(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("party"), []);

  useEffect(() => {
    if (!inviteCode) return;
    void fetch(`/api/social/watch-parties?code=${encodeURIComponent(inviteCode)}`)
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Party unavailable"); setCode(body.party.code); setIsHost(Boolean(body.isHost)); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Party unavailable"));
  }, [inviteCode]);

  async function startParty() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/social/watch-parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to start party");
      setCode(body.party.code); setIsHost(true);
      window.history.replaceState({}, "", `${window.location.pathname}?party=${encodeURIComponent(body.party.code)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to start party"); }
    finally { setBusy(false); }
  }

  async function copyInvite() {
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}?party=${encodeURIComponent(code)}`;
    await navigator.clipboard?.writeText(url);
    setMessage("Invite copied");
  }

  const content = code ? <WatchPartyProvider partyCode={code} isHost={isHost}>{children}</WatchPartyProvider> : children;

  return (
    <div>
      {code ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-card border border-corner-p1/30 bg-corner-p1/10 px-3 py-2 text-xs text-ink-secondary">
          <span><strong className="text-ink">Watch party</strong> · invite code <span className="font-mono font-semibold tracking-widest text-ink">{code}</span>{isHost ? " · host controls playback" : " · playback follows the host"}</span>
          <button type="button" onClick={() => void copyInvite()} className="rounded border border-ink-faint/30 px-2.5 py-1 text-ink hover:bg-arena-800">Copy invite</button>
        </div>
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-card border border-ink-faint/20 bg-arena-900/50 px-3 py-2">
          <div><p className="text-sm font-semibold text-ink">Watch together</p><p className="text-xs text-ink-muted">Create a private room and invite friends with one link.</p></div>
          <button type="button" disabled={busy} onClick={() => void startParty()} className="rounded border border-corner-p1/40 bg-corner-p1/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-corner-p1/20 disabled:opacity-50">{busy ? "Starting…" : "Start party"}</button>
        </div>
      )}
      {message && <p role="status" className="mb-3 text-xs text-ink-muted">{message}</p>}
      {content}
    </div>
  );
}
