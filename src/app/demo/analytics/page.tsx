import Link from "next/link";
import { DemoShell, Stat } from "../_components/demo-shell";

const rows = [
  ["Grand Finals", "12.4K viewers", "186 matches", "92% completion"],
  ["Losers Final", "9.8K viewers", "48 matches", "88% completion"],
  ["Winners Final", "8.7K viewers", "32 matches", "91% completion"],
  ["Top 8", "7.9K viewers", "24 matches", "86% completion"],
];

export default function DemoAnalytics() {
  return (
    <DemoShell title="Analytics & Reports" eyebrow="Tournament Intelligence · Read Only Demo">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Matches" value="186" detail="Across tournament" />
        <Stat label="Completed" value="172" detail="92.5% on schedule" />
        <Stat label="Broadcasts" value="04" detail="2 live · 2 ready" />
        <Stat label="Issues" value="03" detail="2 resolved today" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-card border border-arena-800 bg-arena-900 p-6">
          <div className="flex items-center justify-between"><div><p className="font-display text-2xl uppercase">Event performance</p><p className="mt-1 text-xs text-ink-muted">Operational throughput across the event</p></div><span className="font-mono text-[10px] text-ink-muted">LIVE SNAPSHOT</span></div>
          <div className="mt-7 flex h-48 items-end gap-2">{[38, 52, 46, 70, 66, 88, 78, 102, 96, 122, 114, 140].map((height, i) => <div key={i} className="group flex flex-1 flex-col justify-end"><div className="mb-1 text-center font-mono text-[9px] text-ink-muted opacity-0 group-hover:opacity-100">{height}</div><div className="rounded-t bg-signal-live/70" style={{ height: `${height}px` }} /></div>)}</div>
          <div className="mt-4 flex justify-between font-mono text-[9px] uppercase text-ink-muted"><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span></div>
        </section>

        <section className="rounded-card border border-arena-800 bg-arena-900 p-6">
          <p className="font-display text-2xl uppercase">Operations mix</p>
          <div className="mt-6 space-y-5">
            {[['Matches on time', '92%', 92], ['Stations healthy', '75%', 75], ['Broadcast ready', '100%', 100], ['Schedule coverage', '88%', 88]].map(([label, value, width]) => <div key={String(label)}><div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono text-xs text-signal-live">{value}</span></div><div className="mt-2 h-2 rounded-full bg-arena-800"><div className="h-2 rounded-full bg-signal-live/70" style={{ width: `${width}%` }} /></div></div>)}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-card border border-arena-800 bg-arena-900">
        <div className="border-b border-arena-800 px-6 py-5"><p className="font-display text-2xl uppercase">Match performance</p><p className="mt-1 text-xs text-ink-muted">Tournament-stage reporting and broadcast reach</p></div>
        <div className="divide-y divide-arena-800">{rows.map(([stage, viewers, matches, completion]) => <div key={stage} className="grid gap-2 px-6 py-4 md:grid-cols-[1.3fr_1fr_1fr_1fr]"><span className="font-medium">{stage}</span><span className="font-mono text-xs text-ink-muted">{viewers}</span><span className="font-mono text-xs text-ink-muted">{matches}</span><span className="font-mono text-xs text-signal-live">{completion}</span></div>)}</div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3"><Link href="/demo/organizer" className="rounded-md border border-arena-700 px-4 py-2 font-mono text-xs uppercase">Back to organizer</Link><Link href="/demo/control-room" className="rounded-md border border-arena-700 px-4 py-2 font-mono text-xs uppercase">Control room →</Link></div>
    </DemoShell>
  );
}
