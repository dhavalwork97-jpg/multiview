import Link from "next/link";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function LivePage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="ds-grid relative overflow-hidden border-b border-arena-700 py-10 sm:py-14 lg:py-16">
          <div className="ds-glow -right-24 -top-24 h-80 w-80" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2"><LiveBadge label="Live now" /><span className="page-kicker">FGC broadcast network / on air</span></div>
              <h1 className="display-heading mt-5 text-5xl sm:text-7xl lg:text-8xl">Everything<br className="hidden sm:block" /> happening live.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-muted">Jump straight into active matches, see the score and broadcast context, then move into the full watch experience.</p>
            </div>
            <div className="surface-console min-w-48 p-5">
              <p className="metric-label">Network state</p>
              <div className="mt-2 flex items-center gap-2"><span className="live-dot animate-live-pulse" /><span className="font-display text-3xl uppercase text-signal-live">ON AIR</span></div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Realtime signal / active stations</p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/matches" className="action-primary min-h-11 px-5">Browse all matches</Link>
            <Link href="/tournaments" className="action-secondary min-h-11 px-5">Explore tournaments</Link>
            <Link href="/multiview" className="action-ghost min-h-11 px-5">Open multi-view →</Link>
          </div>
        </section>

        <section className="ds-section">
          <SectionHeader eyebrow="01 / on air" title="Live right now" description="Realtime match state is synchronized through the existing Socket.IO feed." />
          <div className="mt-5"><LiveGrid /></div>
        </section>

        <section className="ds-section pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["WATCH", "Open a match for video, score, chat, reactions and live activity in one place."],
              ["MULTI-VIEW", "Compare active stations when you want more than one broadcast at the same time."],
              ["COMMUNITY", "Stay with the moment through chat, reactions, threads and watch-party presence."],
            ].map(([title, body], index) => (
              <div key={title} className="surface-card surface-card-interactive relative overflow-hidden p-5 sm:p-6">
                <span className="absolute right-5 top-5 ds-index">0{index + 1}</span>
                <p className="section-label">{title}</p><p className="mt-3 text-sm leading-6 text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
