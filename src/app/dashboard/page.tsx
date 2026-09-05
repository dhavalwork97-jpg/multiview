import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { isPremium, trialDaysRemaining } from "@/lib/billing";
import { TrendingStrip } from "@/components/dashboard/TrendingStrip";
import { RecommendedStrip } from "@/components/dashboard/RecommendedStrip";
import { getPrimaryOrganizationMembership } from "@/lib/organization";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SocialPulseWidgets } from "@/components/dashboard/SocialPulseWidgets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  LIVE: "Live",
  SCHEDULED: "Upcoming",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  DRAFT: "Draft",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const memberships = await db.organizationMember.findMany({ where: { userId: user.id }, select: { organizationId: true } });
  const primaryMembership = await getPrimaryOrganizationMembership(user.id);
  const canCreateTournament = user.role === "ADMIN" || primaryMembership?.role === "OWNER" || primaryMembership?.role === "ADMIN";
  const organizationIds = memberships.map((m) => m.organizationId);
  const tournaments = await db.tournament.findMany({
    where: user.role === "ADMIN" ? {} : { organizationId: { in: organizationIds } },
    orderBy: { startDate: "desc" }, take: 8,
    select: { id: true, slug: true, name: true, status: true, startDate: true },
  });

  const tools = [
    ["/tournaments", "Tournaments"], ["/teams", "Teams"], ["/players", "Players"],
    ["/multiview", "Live / Multi-View"], ["/organization/settings", "Organization"],
    ...(user.role === "ADMIN" || user.role === "ORGANIZER" ? [["/admin", "Admin"]] : []),
  ];

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="surface-card mb-8 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0"><p className="page-kicker">Competition workspace</p><h1 className="page-title mt-1 truncate text-3xl">Welcome back, {user.displayName ?? user.username}</h1></div>
            <div className="flex flex-wrap items-center gap-2"><SearchBar /><NotificationBell />{(canCreateTournament || primaryMembership?.role === "OPERATOR") && <Link href="/dashboard/team" className="action-secondary">Team</Link>}<Link href="/organization/settings" className="action-secondary">Branding</Link><Link href="/pricing" className="action-secondary">{isPremium(user) ? `Plans · ${trialDaysRemaining(user)}d` : "Plans"}</Link>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}</div>
          </div>
        </header>

        <section className="mb-10"><div className="mb-3"><p className="section-label">For you</p><h2 className="page-title mt-1 text-2xl">Recommended</h2></div><RecommendedStrip /></section>
        <section className="mb-10"><div className="mb-3"><p className="section-label">Community signal</p><h2 className="page-title mt-1 text-2xl">Trending</h2></div><TrendingStrip /></section>
        <SocialPulseWidgets />

        <section className="surface-card mb-10 border-signal-live/30 bg-signal-live/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="page-kicker text-signal-live">Plans</p><h2 className="mt-1 font-display text-2xl uppercase">Paid plans are coming soon</h2><p className="mt-1 text-sm text-ink-muted">Explore Starter, Pro and Event pricing. Billing and subscriptions are not enabled yet.</p></div><div className="flex gap-2"><Link href="/organization/settings" className="action-secondary">Branding</Link><Link href="/pricing" className="action-primary">View plans</Link></div></div>
        </section>

        <section className="surface-card mb-10 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-label">Quick access</p><h2 className="page-title mt-1 text-2xl">All tools</h2></div>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{tools.map(([href, label]) => <Link key={href} href={href} className="surface-card surface-card-interactive flex min-h-14 items-center justify-center border-arena-700 bg-arena-950 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</Link>)}</div>
        </section>

        <section className="mb-10"><div className="mb-3 flex items-end justify-between"><div><p className="section-label">Owned events</p><h2 className="page-title mt-1 text-2xl">Your tournaments</h2></div></div>{tournaments.length === 0 ? <div className="empty-state"><p>You haven't created a tournament yet.</p>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-secondary mt-3">Create your first tournament</Link>}</div> : <ul className="surface-card divide-y divide-arena-700 overflow-hidden">{tournaments.map((t) => <li key={t.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/admin/tournaments/${t.id}`} className="font-display text-lg uppercase hover:text-signal-live">{t.name}</Link><span className={t.status === "LIVE" ? "status-live" : "status-neutral"} aria-label={`Status: ${STATUS_LABEL[t.status] ?? t.status}`}>{t.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" aria-hidden="true" />}{STATUS_LABEL[t.status] ?? t.status}</span></div><p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{new Date(t.startDate).toLocaleDateString()}</p></div><div className="flex flex-wrap items-center gap-3"><Link href={`/e/${t.slug}`} className="font-mono text-[10px] uppercase tracking-wide text-ink-faint hover:text-ink">Public page</Link><Link href={`/admin/tournaments/${t.id}/analytics`} className="font-mono text-[10px] uppercase tracking-wide text-ink-faint hover:text-signal-live">Analytics</Link><Link href={`/admin/tournaments/${t.id}/control-room`} className="action-secondary">Manage stations</Link></div></li>)}</ul>}</section>
        <section><div className="mb-3"><p className="section-label">Live signal</p><h2 className="page-title mt-1 text-2xl">Live right now</h2></div><LiveGrid /></section>
      </div>
    </main>
  );
}
