"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TournamentAdminNav } from "@/components/admin/TournamentAdminNav";

type Report = any;

export default function TournamentReportPage() {
  const params = useParams<{ tournamentId: string }>();
  const { tournamentId } = params;
  const [data, setData] = useState<Report>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/tournaments/${tournamentId}/report`, { cache: "no-store" }).then(async r => { const j=await r.json(); if(!r.ok) throw new Error(j.error); setData(j); }).catch(e=>setError(e.message)); }, [tournamentId]);
  if (error) return <main className="mx-auto max-w-6xl p-6 text-signal-error">{error}</main>;
  if (!data) return <main className="mx-auto max-w-6xl p-6 text-ink-faint">Generating event report…</main>;
  const cards = [
    ["Matches", data.summary.totalMatches], ["Completed", data.summary.completed], ["Live", data.summary.live],
    ["Queued", data.summary.queued], ["Avg min", data.summary.avgMatchMinutes], ["Views", data.summary.views],
    ["Unique viewers", data.summary.uniqueViewers], ["Watch hours", data.summary.watchHours],
  ];
  return <main className="mx-auto max-w-6xl space-y-6 p-6"><TournamentAdminNav tournamentId={tournamentId} />
    <div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Organizer analytics</p><h1 className="font-display text-3xl uppercase">{data.tournament.name}</h1><p className="text-sm text-ink-faint">{data.tournament.game} · {data.tournament.status}</p></div><Link href={`/admin/tournaments/${tournamentId}/control-room`} className="rounded-card border border-arena-600 px-3 py-2 text-xs">Control room</Link></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([l,v])=><div key={l as string} className="rounded-card border border-arena-600 bg-arena-900 p-4"><p className="font-mono text-[10px] uppercase text-ink-faint">{l}</p><p className="mt-1 font-display text-2xl">{v}</p></div>)}</div>
    <section className="rounded-card border border-arena-600 bg-arena-900 p-4"><div className="flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Audience</p><h2 className="font-display text-xl uppercase">Top matches</h2></div><span className="font-mono text-[10px] text-ink-faint">Views / watch time</span></div><div className="mt-3 divide-y divide-arena-700">{(data.topMatches ?? []).map((m:any)=><div key={`${m.matchId}-${m.dayKey}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm">{m.match ? `${m.match.playerOne.gamertag} vs ${m.match.playerTwo.gamertag}` : m.matchId}</p><p className="text-[10px] font-mono text-ink-faint">{m.match?.round ?? "Match"}{m.match?.station ? ` · ${m.match.station.label}` : ""}</p></div><div className="text-right font-mono text-xs"><span>{m.views} views</span><span className="ml-3 text-ink-faint">{Math.floor(m.watchSeconds / 60)} min</span></div></div>)}{(!data.topMatches || data.topMatches.length === 0) && <p className="py-4 text-sm text-ink-faint">No audience data yet.</p>}</div></section>
    <section className="rounded-card border border-arena-600 bg-arena-900 p-4"><h2 className="font-display text-xl uppercase">Station performance</h2><div className="mt-3 divide-y divide-arena-700">{data.stations.map((s:any)=><div key={s.label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{s.label}</span><span className="font-mono text-xs text-ink-faint">{s.status} · {s.bitrateKbps} kbps · {s.droppedFrames} dropped</span></div>)}</div></section>
    <p className="font-mono text-[10px] text-ink-faint">Audit events: {data.summary.auditEvents} · Generated {new Date(data.generatedAt).toLocaleString()}</p>
  </main>;
}
