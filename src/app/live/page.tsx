import Link from "next/link";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function LivePage() {
  return (
    <main className="page-shell space-y-10 pb-16 pt-8 sm:pt-10">
      <section className="relative overflow-hidden rounded-card border border-arena-700 bg-arena-900 p-6 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-signal-live/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <LiveBadge label="Live now" />
          <p className="section-label mt-5">FGC broadcast network</p>
          <h1 className="display-heading mt-2 text-4xl sm:text-5xl">Everything happening live.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
            Jump straight into active matches, see the score and broadcast context, then move into the full watch experience.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/matches" className="action-primary">Browse all matches</Link>
            <Link href="/tournaments" className="action-ghost">Explore tournaments</Link>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="On air"
          title="Live right now"
          description="Realtime match state is synchronized through the existing Socket.IO feed."
        />
        <div className="mt-5">
          <LiveGrid />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["WATCH", "Open a match to get video, score, chat, reactions and live activity in one place."],
          ["MULTI-VIEW", "Compare active stations when you want more than one broadcast at the same time."],
          ["COMMUNITY", "Stay with the moment through chat, reactions, threads and watch-party presence."],
        ].map(([title, body]) => (
          <div key={title} className="surface-quiet p-5">
            <p className="section-label">{title}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
