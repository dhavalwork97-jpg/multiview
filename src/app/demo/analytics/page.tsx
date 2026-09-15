import { DemoShell, Stat } from "../_components/demo-shell";

const rows = [["Grand Finals","12.4K viewers","186 matches"],["Losers Final","9.8K viewers","48 matches"],["Winners Final","8.7K viewers","32 matches"],["Top 8","7.9K viewers","24 matches"]];

export default function DemoAnalytics() {
  return <DemoShell title="Analytics" eyebrow="Competition Intelligence · Public Demo">
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Registrations" value="1,284" detail="+18.4% this month"/><Stat label="Peak viewers" value="12.4K" detail="Grand Finals"/><Stat label="Matches completed" value="186" detail="Across 3 events"/><Stat label="Avg. watch time" value="38m" detail="Live audience"/></div>
    <div className="mt-8 grid gap-4 lg:grid-cols-2"><section className="rounded-card border border-arena-800 bg-arena-900 p-6"><p className="font-display text-2xl uppercase">Viewer growth</p><p className="mt-1 text-sm text-ink-muted">Audience trend across the event window.</p><div className="mt-8 flex h-40 items-end gap-2">{[30,45,38,62,70,82,96,88,100,112,125,138].map((h,i)=><div key={i} className="flex-1 rounded-t bg-signal-live/70" style={{height:`${h}px`}}/>)}</div></section><section className="rounded-card border border-arena-800 bg-arena-900 p-6"><p className="font-display text-2xl uppercase">Match performance</p><div className="mt-6 space-y-4">{rows.map(([a,b,c])=><div key={a} className="grid grid-cols-[1fr_auto] border-b border-arena-800 pb-3"><span>{a}</span><span className="font-mono text-xs text-signal-live">{b} · {c}</span></div>)}</div></section></div>
  </DemoShell>;
}
