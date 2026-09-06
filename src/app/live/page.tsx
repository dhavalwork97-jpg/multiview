import Link from "next/link";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

const LIVE_PATHS = [
  ["WATCH", "Open a match for video, score, chat, reactions and live activity.", "/matches", "Find a match"],
  ["MULTI-VIEW", "Compare active stations when more than one broadcast matters.", "/multiview", "Open MultiView"],
  ["COMMUNITY", "Stay with the moment through reactions, threads and watch-party presence.", "/community", "Open community"],
] as const;

export default function LivePage() {
  return (
    <main className="page-shell space-y-10 pb-16 pt-8 sm:pt-10">
      <section className="relative overflow-hidden rounded-card border border-arena-700 bg-arena-900 p-6 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-signal-live/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 right-1/3 h-px w-40 bg-signal-live/30" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <LiveBadge label="Live now" />
          <p className="section-label mt-5">FGC broadcast network</p>
          <h1 className="display-heading mt-2 text-4xl sm:text-5xl">Everything happening live.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
            Jump straight into active matches, see the score and broadcast context, then move into the full watch experience.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/matches?status=LIVE" className="action-primary">Browse live matches</Link>
            <Link href="/tournaments?status=live" className="action-secondary">Live tournaments</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="live-now-heading">
        <SectionHeader
          eyebrow="On air"
          title="Live right now"
          description="Realtime match state is synchronized through the existing Socket.IO feed."
        />
        <div id="live-now-heading" className="mt-5">
          <LiveGrid />
        </div>
      </section>

      <section aria-label="Live experience paths" className="grid gap-4 md:grid-cols-3">
        {LIVE_PATHS.map(([title, body, href, label]) => (
          <Link key={title} href={href} className="surface-card surface-card-interactive group p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60">
            <div className="flex items-center justify-between gap-3">
              <p className="section-label">{title}</p>
              <span className="font-mono text-sm text-ink-faint transition-colors group-hover:text-signal-live" aria-hidden="true">↗</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
            <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint group-hover:text-signal-live">{label}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
