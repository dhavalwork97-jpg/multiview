"use client";

import { useEffect, useState } from "react";

export default function ReplayOperator({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [title, setTitle] = useState("Featured Replay");
  const [sourceUrl, setSourceUrl] = useState("");
  const [message, setMessage] = useState("Ready");

  useEffect(() => { void params.then(({ tournamentId: id }) => setTournamentId(id)); }, [params]);

  async function playReplay() {
    if (!tournamentId) return;
    const response = await fetch("/api/broadcast/replay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tournamentId, clip: { id: `replay-${Date.now()}`, title, sourceUrl: sourceUrl || null, durationMs: 10000 } }),
    });
    setMessage(response.ok ? "Replay sent to program" : "Replay command failed");
  }

  return <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}><div style={{ maxWidth: 900, margin: "0 auto" }}><div style={{ fontSize: 12, letterSpacing: ".18em", opacity: .5, textTransform: "uppercase" }}>FGC Broadcast Studio</div><h1 style={{ fontSize: 38, margin: "8px 0 24px" }}>Replay Center</h1><section style={{ background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 24 }}><label style={{ display: "block", opacity: .55, fontSize: 12 }}>REPLAY TITLE</label><input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", margin: "8px 0 18px", padding: 12, background: "#11131a", color: "white", border: "1px solid #292d39", borderRadius: 10 }} /><label style={{ display: "block", opacity: .55, fontSize: 12 }}>SOURCE URL</label><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Optional replay media URL" style={{ width: "100%", margin: "8px 0 18px", padding: 12, background: "#11131a", color: "white", border: "1px solid #292d39", borderRadius: 10 }} /><button onClick={playReplay} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#8b5cf6", color: "white", fontWeight: 700 }}>Play Replay</button><div style={{ marginTop: 14, opacity: .55, fontSize: 13 }}>{message}</div></section></div></main>;
}
