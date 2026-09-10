"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminShowcasePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tournamentId: string; name: string; urls: Record<string, string> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/showcase/seed", { method: "POST" });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Unable to create showcase");
    else setResult(data);
    setLoading(false);
  }

  const links = result ? [
    ["Viewer tournament", result.urls.viewer],
    ["Live overlay", result.urls.overlay],
    ["Standings overlay", result.urls.standings],
    ["Control room", result.urls.controlRoom],
    ["MultiView", result.urls.multiview],
    ["Broadcast center", result.urls.broadcast],
    ["Public showcase", result.urls.showcase],
  ] : [];

  return <main className="min-h-screen bg-arena-950 px-6 py-8"><div className="mx-auto max-w-5xl">
    <Link href="/admin" className="text-xs font-mono uppercase tracking-widest text-ink-faint hover:text-signal-live">← Admin</Link>
    <header className="mt-5 rounded-card border border-signal-live/30 bg-arena-900 p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-signal-live">FGC Masters / Showcase</p>
      <h1 className="mt-2 font-display text-4xl uppercase">Launch the complete demo</h1>
      <p className="mt-3 max-w-3xl text-sm text-ink-muted">Create a connected Championship Weekend dataset for product demos, broadcast validation and viewer testing. It includes teams, players, tournament stages, completed matches, scoring events and a Battle Royale lobby.</p>
      <button onClick={seed} disabled={loading} className="mt-6 action-primary disabled:opacity-50">{loading ? "Preparing showcase…" : "Create / refresh showcase"}</button>
    </header>
    {error && <div className="mt-4 rounded-card border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
    {result && <section className="mt-6 rounded-card border border-arena-700 bg-arena-900 p-6"><p className="font-mono text-xs uppercase text-signal-live">Ready</p><h2 className="mt-1 font-display text-2xl uppercase">{result.name}</h2><p className="mt-1 text-xs text-ink-faint">Tournament ID: {result.tournamentId}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map(([label, href]) => <Link key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined} className="rounded-card border border-arena-700 bg-arena-950 p-4 hover:border-signal-live"><p className="font-display uppercase">{label}</p><p className="mt-1 truncate text-xs text-ink-faint">{href}</p></Link>)}</div></section>}
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><Info title="Admin" body="Seed once, then open every operating surface directly."/><Info title="Viewer" body="Use the public tournament and Championship Weekend experience."/><Info title="Broadcast" body="Launch live and standings browser-source overlays for OBS."/></section>
  </div></main>
}
function Info({ title, body }: { title: string; body: string }) { return <div className="rounded-card border border-arena-700 bg-arena-900 p-4"><p className="font-display uppercase">{title}</p><p className="mt-1 text-sm text-ink-faint">{body}</p></div>; }
