import Link from "next/link";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import { SocialPulseWidgets } from "@/components/dashboard/SocialPulseWidgets";

export function ViewerExperience() {
  return (
    <div className="space-y-10">
      <section className="surface-card border-signal-live/30 bg-signal-live/[0.04] p-5 sm:p-6">
        <p className="page-kicker text-signal-live">Fan experience</p>
        <h2 className="page-title mt-1 text-3xl">Watch. React. Connect.</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Your viewer workspace is focused on live competition, community activity and interactive match experiences.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/tournaments" className="action-primary">Browse tournaments</Link>
          <Link href="/social" className="action-secondary">Open social</Link>
          <Link href="/friends" className="action-secondary">Friends</Link>
          <Link href="/activity" className="action-secondary">Activity</Link>
          <Link href="/chat" className="action-secondary">Chat</Link>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="section-label">Live competition</p>
          <h2 className="page-title mt-1 text-2xl">Watch live now</h2>
        </div>
        <DashboardWidgetBoundary label="Live matches">
          <LiveGrid />
        </DashboardWidgetBoundary>
      </section>

      <DashboardWidgetBoundary label="Community pulse">
        <SocialPulseWidgets />
      </DashboardWidgetBoundary>

      <section className="surface-card p-5">
        <div className="mb-4">
          <p className="section-label">Your interactive toolkit</p>
          <h2 className="page-title mt-1 text-2xl">Stay in the action</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["/multiview", "Multi-View"],
            ["/friends", "Friends"],
            ["/activity", "Activity"],
            ["/chat", "Chat"],
            ["/watch-party", "Watch Party"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="surface-card surface-card-interactive flex min-h-14 items-center justify-center border-arena-700 bg-arena-950 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
