import Link from "next/link";
import { DemoShell, Stat } from "../_components/demo-shell";

export default function DemoTournament() {
  return <DemoShell title="Tournament" eyebrow="Event Operations · Public Demo">
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Event status" value="LIVE" detail="FGC Masters 2026"/><Stat label="Players" value="128" detail="Registration locked"/><Stat label="Matches" value="186" detail="12 scheduled"/><Stat label="Stations" value="24" detail="22 ready · 2 standby"/></div>
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-card border border-arena-800 bg-arena-900 p-6"><p className="font-display text-2xl uppercase">Competition setup</p><p className="mt-1 text-sm text-ink-muted">Configure the event, participants, stages and operations from one workspace.</p><div className="mt-6 grid gap-3 md:grid-cols-2">{["Event identity & branding","Games, stages & formats","Registration & participants","Schedule & station plan"].map((item,i)=><div key={item} className="rounded-lg border border-arena-800 bg-arena-950 p-4"><p className="font-mono text-xs text-signal-live">0{i+1}</p><p className="mt-2 font-medium">{item}</p><p className="mt-1 text-xs text-ink-muted">Configured for the live event workspace</p></div>)}</div></section>
      <section className="rounded-card border border-arena-800 bg-arena-900 p-6"><p className="font-display text-2xl uppercase">Event flow</p><div className="mt-5 space-y-3">{[["01","Register","128 players confirmed"],["02","Seed & bracket","Top 128 ready"],["03","Schedule","24 stations mapped"],["04","Run event","Control Room active"]].map(([n,a,b])=><div key={n} className="flex gap-4 border-b border-arena-800 pb-3"><span className="font-mono text-xs text-ink-faint">{n}</span><div><p className="font-medium">{a}</p><p className="text-xs text-ink-muted">{b}</p></div></div>)}</div><Link href="/demo/control-room" className="mt-6 inline-flex rounded-full border border-signal-live/50 px-4 py-2 text-xs uppercase tracking-wider text-signal-live">Open Control Room →</Link></section>
    </div>
  </DemoShell>;
}
