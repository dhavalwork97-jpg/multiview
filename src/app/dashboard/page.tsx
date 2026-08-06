import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { BillingButton } from "@/components/billing/BillingButton";
import { TrendingStrip } from "@/components/dashboard/TrendingStrip";
import { RecommendedStrip } from "@/components/dashboard/RecommendedStrip";
import { isPremium } from "@/lib/billing";

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
        <BillingButton isPremium={isPremium(user)} />
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
                <span className="font-medium">{t.name}</span>
                <span className="font-mono text-xs uppercase text-ink-faint">{t.status}</span>
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
