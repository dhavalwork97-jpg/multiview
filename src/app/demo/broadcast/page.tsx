import Link from "next/link";
import { DemoShell, Stat } from "../_components/demo-shell";

const destinations = [
  ["YouTube", "CONNECTED", "FGC Championship · Main Channel"],
  ["Twitch", "READY", "fgcstream"],
  ["Custom RTMP", "STANDBY", "Backup encoder endpoint"],
] as const;

export default function DemoBroadcastPage() {
  return (
    <DemoShell title="Broadcast destinations" eyebrow="Broadcast Automation · Read Only Demo">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Destinations" value="03" detail="Configured" />
        <Stat label="Primary" value="YouTube" detail="Connected" />
        <Stat label="Event" value="READY" detail="Broadcast configured" />
        <Stat label="Fallback" value="RTMP" detail="Available" />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <div className="rounded-card border border-arena-700 bg-arena-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">Primary destination</p>
              <h2 className="mt-2 font-display text-3xl uppercase">YouTube Live</h2>
              <p className="mt-2 text-sm text-ink-muted">The organizer connects the channel once, then prepares the event from the tournament broadcast workspace.</p>
            </div>
            <span className="rounded-full border border-signal-live/40 bg-signal-live/10 px-3 py-1 font-mono text-xs text-signal-live">CONNECTED</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[['Event', 'FGC Championship Finals'], ['Visibility', 'Public'], ['Latency', 'Low']].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-arena-800 bg-arena-950 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
                <p className="mt-2 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-arena-700 bg-arena-900 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">Broadcast lifecycle</p>
          <div className="mt-5 space-y-3">
            {['Connect channel', 'Prepare live event', 'Start program', 'Monitor health', 'Stop & archive'].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl border border-arena-800 bg-arena-950 p-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-arena-700 font-mono text-xs">{index + 1}</span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">Destinations</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {destinations.map(([provider, status, detail]) => (
            <div key={provider} className="rounded-card border border-arena-700 bg-arena-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl uppercase">{provider}</h3>
                <span className="font-mono text-[10px] text-signal-live">{status}</span>
              </div>
              <p className="mt-3 text-sm text-ink-muted">{detail}</p>
              <div className="mt-5 h-1 rounded-full bg-arena-800"><div className="h-1 w-4/5 rounded-full bg-signal-live" /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/demo/control-room" className="rounded-xl border border-signal-live bg-signal-live/10 px-4 py-3 font-mono text-xs uppercase tracking-wider text-signal-live">Open Control Room →</Link>
        <Link href="/demo/overlay" className="rounded-xl border border-arena-700 bg-arena-900 px-4 py-3 font-mono text-xs uppercase tracking-wider">Open Broadcast Overlay →</Link>
      </div>
    </DemoShell>
  );
}
