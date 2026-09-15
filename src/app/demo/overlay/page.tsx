import { DemoShell } from "../_components/demo-shell";

export default function DemoOverlay() {
  return <DemoShell title="Broadcast Overlay" eyebrow="On-Air Graphics · Public Demo">
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section className="overflow-hidden rounded-card border border-arena-800 bg-arena-900 p-6"><p className="font-display text-2xl uppercase">HUD Studio</p><p className="mt-1 text-sm text-ink-muted">Build broadcast-ready match graphics and keep the on-air state synchronized.</p><div className="mt-6 aspect-video rounded-lg border border-arena-700 bg-arena-950 p-5"><div className="flex items-center justify-between border-b border-arena-800 pb-3"><span className="font-mono text-xs text-signal-live">● LIVE · STATION 01</span><span className="font-mono text-xs text-ink-faint">FGC MASTERS 2026</span></div><div className="flex h-full items-center justify-center gap-8"><div className="text-center"><p className="font-display text-3xl uppercase">Soul</p><p className="mt-2 font-mono text-4xl">2</p></div><span className="font-mono text-xs text-ink-faint">VS</span><div className="text-center"><p className="font-display text-3xl uppercase">GE</p><p className="mt-2 font-mono text-4xl">1</p></div></div></div></section>
      <section className="rounded-card border border-arena-800 bg-arena-900 p-6"><p className="font-display text-2xl uppercase">Graphics stack</p><div className="mt-5 space-y-3">{["Scoreboard","Lower third","Match intro","Sponsor slot","Results card"].map((x,i)=><div key={x} className="flex items-center justify-between border-b border-arena-800 pb-3"><span>{x}</span><span className="font-mono text-xs text-signal-live">{i<3?"ACTIVE":"READY"}</span></div>)}</div></section>
    </div>
  </DemoShell>;
}
