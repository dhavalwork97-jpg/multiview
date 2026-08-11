import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { isPremium, trialDaysRemaining } from "@/lib/billing";
import { TrendingStrip } from "@/components/dashboard/TrendingStrip";
import { RecommendedStrip } from "@/components/dashboard/RecommendedStrip";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const tournaments = await db.tournament.findMany({
    where: { organizerId: user.id },
    orderBy: { startDate: "desc" },
    take: 5,
    select: { id: true, name: true, status: true, startDate: true },
  });

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Dashboard</p>
          <h1 className="font-display text-3xl uppercase tracking-wide">
            Welcome back, {user.displayName ?? user.username}
          </h1>
        </div>
        <SearchBar />
        <Link href="/pricing" className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live">{isPremium(user) ? `Trial / Plans · ${trialDaysRemaining(user)}d` : "Plans & Free Trial"}</Link>
      </header>

      <section className="mb-10">
        <RecommendedStrip />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">
          Trending
        </h2>
        <TrendingStrip />
      </section>


      <section className="mb-10 rounded-card border border-signal-live/30 bg-signal-live/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">Monetization</p><h2 className="mt-1 font-display text-xl uppercase tracking-wide">Paid plans are coming soon</h2><p className="mt-1 text-sm text-ink-muted">Explore Starter, Pro and Event pricing. Billing, subscriptions and the customer portal are not enabled yet.</p></div>
          <Link href="/pricing" className="rounded-card bg-signal-live px-4 py-2 font-mono text-xs uppercase tracking-wide text-arena-950">View plans</Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">
          Your tournaments
        </h2>
        {tournaments.length === 0 ? (
          <div className="rounded-card border border-dashed border-arena-600 p-6 text-ink-muted">
            You haven't created a tournament yet.
          </div>
        ) : (
          <ul className="divide-y divide-arena-700 rounded-card border border-arena-700">
            {tournaments.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/admin/tournaments/${t.id}`}
                    className="font-medium hover:text-signal-live"
                  >
                    {t.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    {t.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/tournaments/${t.id}`}
                    className="font-mono text-xs uppercase tracking-wide text-ink-faint hover:text-ink"
                  >
                    View public page
                  </Link>
                  <Link
                    href={`/admin/tournaments/${t.id}`}
                    className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:border-signal-live hover:text-signal-live"
                  >
                    Manage stations
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">
          Live right now
        </h2>
        <LiveGrid />
      </section>
    </main>
  );
}
