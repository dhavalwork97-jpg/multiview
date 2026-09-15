import Link from "next/link";
import { DemoShell, Stat } from "../_components/demo-shell";

const scenes = ["Program", "Preview", "Replay", "Sponsor", "Break"];
const stations = [
  ["Station 01", "LIVE", "SF6 · Grand Finals", "00:42"],
  ["Station 02", "READY", "Tekken 8 · Losers Final", "01:18"],
  ["Station 03", "READY", "Street Fighter 6 · Top 8", "02:06"],
  ["Station 04", "ISSUE", "Signal check required", "—"],
];

export default function DemoControlRoom() {
  return (
    <DemoShell title="Tournament Control Room" eyebrow="Broadcast Operations · Read Only Demo">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Program" value="STATION 01" detail="On air now" />
        <Stat label="Preview" value="STATION 02" detail="Ready to take" />
        <Stat label="Stations" value="3 / 4" detail="Operational" />
        <Stat label="Alerts" value="01" detail="Needs attention" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section className="overflow-hidden rounded-card border border-arena-800 bg-arena-950">
          <div className="flex items-center justify-between border-b border-arena-800 px-5 py-4">
            <div>
              <p className="font-display text-xl uppercase">Program / Preview</p>
              <p className="text-xs text-ink-muted">Manual broadcast scene control</p>
            </div>
            <span className="rounded-full border border-signal-live/30 bg-signal-live/10 px-3 py-1 font-mono text-[10px] text-signal-live">ON AIR</span>
          </div>
          <div className="grid gap-px bg-arena-800 md:grid-cols-2">
            <div className="min-h-64 bg-arena-900 p-5">
              <p className="font-mono text-[10px] uppercase text-signal-live">Program</p>
              <div className="mt-4 flex aspect-video items-center justify-center rounded-lg border border-signal-live/30 bg-black">
                <div className="text-center"><div className="font-display text-4xl uppercase">VCT</div><div className="mt-1 font-mono text-xs text-ink-muted">GRAND FINALS · LIVE</div></div>
              </div>
            </div>
            <div className="min-h-64 bg-arena-900 p-5">
              <p className="font-mono text-[10px] uppercase text-ink-muted">Preview</p>
              <div className="mt-4 flex aspect-video items-center justify-center rounded-lg border border-arena-700 bg-arena-950">
                <div className="text-center"><div className="font-display text-3xl uppercase">STATION 02</div><div className="mt-1 font-mono text-xs text-ink-muted">TEKKEN 8 · LOSERS FINAL</div></div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 p-5">
            {scenes.map((scene, index) => <button key={scene} type="button" className={`rounded-md border px-4 py-2 font-mono text-xs uppercase ${index === 0 ? "border-signal-live/40 bg-signal-live/10 text-signal-live" : "border-arena-700 bg-arena-900 text-ink-muted"}`}>{scene}</button>)}
          </div>
        </section>

        <section className="rounded-card border border-arena-800 bg-arena-900 p-5">
          <div className="flex items-center justify-between"><div><p className="font-display text-xl uppercase">Station health</p><p className="text-xs text-ink-muted">Live operational status</p></div><span className="font-mono text-[10px] text-ink-muted">AUTO REFRESH</span></div>
          <div className="mt-5 space-y-3">{stations.map(([name, status, match, time]) => <div key={name} className="rounded-lg border border-arena-800 bg-arena-950 p-4"><div className="flex items-center justify-between"><span className="font-mono text-xs">{name}</span><span className={`font-mono text-[10px] ${status === "LIVE" ? "text-signal-live" : status === "ISSUE" ? "text-signal-warn" : "text-ink-muted"}`}>{status}</span></div><p className="mt-2 text-sm">{match}</p><p className="mt-1 font-mono text-[10px] text-ink-muted">{time}</p></div>)}</div>
        </section>
      </div>

      <section className="mt-6 rounded-card border border-arena-800 bg-arena-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-xl uppercase">Broadcast workflow</p><p className="text-xs text-ink-muted">The production Control Room connects tournament operations, stations and broadcast output.</p></div><Link href="/demo/overlay" className="rounded-md border border-arena-700 px-4 py-2 font-mono text-xs uppercase">Open overlay →</Link></div>
      </section>
    </DemoShell>
  );
}
