"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TournamentReportPage() {
  const params = useParams<{ tournamentId: string }>();
  const { tournamentId } = params;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/tournaments/${tournamentId}/report`, { cache: "no-store" }).then(async r => { const j=await r.json(); if(!r.ok) throw new Error(j.error); setData(j); }).catch(e=>setError(e.message)); }, [tournamentId]);
  if (error) return <main className="mx-auto max-w-5xl p-6 text-signal-error">{error}</main>;
  if (!data) return <main className="mx-auto max-w-5xl p-6 text-ink-faint">Generating event report…</main>;
  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Organizer report</p><h1 className="font-display text-3xl uppercase">{data.tournament.name}</h1><p className="text-sm text-ink-faint">{data.tournament.game} · {data.tournament.status}</p></div><Link href={`/admin/tournaments/${tournamentId}/control-room`} className="rounded-card border border-arena-600 px-3 py-2 text-xs">Control room</Link></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[["Matches",data.summary.totalMatches],["Completed",data.summary.completed],["Live",data.summary.live],["Queued",data.summary.queued],["Avg min",data.summary.avgMatchMinutes],["Views",data.summary.views],["Watch min",Math.floor((data.summary.watchSeconds ?? 0)/60)]].map(([l,v])=><div key={l as string} className="rounded-card border border-arena-600 bg-arena-900 p-4"><p className="font-mono text-[10px] uppercase text-ink-faint">{l}</p><p className="mt-1 font-display text-2xl">{v}</p></div>)}</div>
    <section className="rounded-card border border-arena-600 bg-arena-900 p-4"><h2 className="font-display text-xl uppercase">Station performance</h2><div className="mt-3 divide-y divide-arena-700">{data.stations.map((s:any)=><div key={s.label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{s.label}</span><span className="font-mono text-xs text-ink-faint">{s.status} · {s.bitrateKbps} kbps · {s.droppedFrames} dropped</span></div>)}</div></section>
    <p className="font-mono text-[10px] text-ink-faint">Audit events: {data.summary.auditEvents} · Generated {new Date(data.generatedAt).toLocaleString()}</p>
  </main>;
}
