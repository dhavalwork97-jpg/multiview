import Link from "next/link";
import type { OrganizationRole } from "@prisma/client";
import { OrganizerControlCenter } from "@/components/dashboard/OrganizerControlCenter";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { TrendingStrip } from "@/components/dashboard/TrendingStrip";
import { RecommendedStrip } from "@/components/dashboard/RecommendedStrip";
import { SocialPulseWidgets } from "@/components/dashboard/SocialPulseWidgets";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";

type DashboardRole = OrganizationRole | "ADMIN" | null;

type OrganizerUser = {
  displayName: string | null;
  username: string;
  role: string;
};

type Tournament = {
  id: string;
  slug: string;
  name: string;
  status: string;
  startDate: Date;
};

export function OrganizerDashboard({
  user,
  role,
  tournaments,
  canCreateTournament,
  canManageOrganization,
  canAccessAdmin,
  dataWarning,
}: {
  user: OrganizerUser;
  role: DashboardRole;
  tournaments: Tournament[];
  canCreateTournament: boolean;
  canManageOrganization: boolean;
  canAccessAdmin: boolean;
  dataWarning: boolean;
}) {
  const tools: Array<[string, string, string]> = [
    ["/tournaments", "Tournaments", "Competition"],
    ["/multiview", "Multi-View", "Broadcast"],
    ["/teams", "Teams", "Roster"],
    ["/players", "Players", "Talent"],
    ...(canManageOrganization ? [["/organization/settings", "Organization", "Brand"] as [string, string, string]] : []),
    ...(canAccessAdmin ? [["/admin", "Admin", "Platform"] as [string, string, string]] : []),
  ];

  const firstName = user.displayName?.split(" ")[0] ?? user.username;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[22px] border border-arena-600 bg-[radial-gradient(circle_at_85%_10%,rgba(108,99,255,.22),transparent_34%),radial-gradient(circle_at_15%_100%,rgba(32,224,164,.08),transparent_30%),linear-gradient(135deg,#11121a,#09090d)] p-5 shadow-elevated sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-broadcast-grid bg-[length:42px_42px] opacity-40" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-live"><span className="live-dot animate-live-pulse" aria-hidden="true" />Operations online</span>
              <span className="status-neutral">{role ?? "VIEWER"}</span>
            </div>
            <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[.22em] text-ink-faint">FGC / tournament operations</p>
            <h1 className="mt-2 max-w-4xl font-display text-5xl uppercase leading-[.86] tracking-[.015em] text-ink sm:text-7xl lg:text-8xl">Command the competition.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Good to see you, {firstName}. Run tournaments, broadcasts, stations and community operations from one high-density workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[290px]">
            <div className="surface-quiet p-4"><p className="metric-label">Events</p><p className="ds-number mt-2 text-4xl">{tournaments.length}</p><p className="mt-1 text-xs text-ink-faint">in workspace</p></div>
            <div className="surface-quiet p-4"><p className="metric-label">Access</p><p className="mt-2 font-display text-4xl uppercase text-signal-live">Live</p><p className="mt-1 text-xs text-ink-faint">operator session</p></div>
          </div>
        </div>
      </section>

      <section className="surface-console overflow-hidden p-1">
        <OrganizerControlCenter
          role={role}
          tournamentCount={tournaments.length}
          canCreateTournament={canCreateTournament}
          canManageOrganization={canManageOrganization}
          canAccessAdmin={canAccessAdmin}
        />
      </section>

      <section>
        <div className="ds-section-header"><div><p className="ds-index">01 / workspace</p><h2 className="section-heading">Operational tools</h2></div>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {tools.map(([href, label, meta], index) => (
            <Link key={href} href={href} className="surface-card surface-card-interactive group relative min-h-28 overflow-hidden p-5">
              <span className="absolute right-4 top-4 ds-index">0{index + 1}</span>
              <p className="section-label">{meta}</p>
              <h3 className="mt-5 font-display text-2xl uppercase tracking-wide group-hover:text-signal-live">{label}</h3>
              <span className="mt-3 inline-block font-mono text-[9px] uppercase tracking-widest text-ink-faint group-hover:text-ink">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="ds-section-header"><div><p className="ds-index">02 / competition</p><h2 className="section-heading">Your tournaments</h2></div></div>
        {tournaments.length === 0 ? (
          <div className="empty-state"><p>{dataWarning ? "Tournament data is temporarily unavailable." : "You haven't created a tournament yet."}</p>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-secondary mt-3">Create your first tournament</Link>}</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {tournaments.map((tournament) => (
              <article key={tournament.id} className="surface-card surface-card-interactive overflow-hidden">
                <div className="border-b border-arena-700 bg-arena-950/40 px-5 py-3"><div className="flex items-center justify-between gap-3"><span className="section-label">{new Date(tournament.startDate).toLocaleDateString()}</span><span className={tournament.status === "LIVE" ? "status-live" : "status-neutral"}>{tournament.status === "LIVE" && <span className="live-dot animate-live-pulse" aria-hidden="true" />}{tournament.status}</span></div></div>
                <div className="p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-3xl uppercase tracking-wide">{tournament.name}</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[.14em] text-ink-faint">Tournament workspace</p></div><span className="ds-index">LIVE OPS</span></div><div className="mt-6 flex flex-wrap gap-2"><Link href={`/admin/tournaments/${tournament.id}`} className="action-secondary">Manage</Link><Link href={`/e/${tournament.slug}`} className="action-ghost">Public page →</Link><Link href={`/admin/tournaments/${tournament.id}/analytics`} className="action-ghost">Analytics →</Link></div></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="ds-section-header"><div><p className="ds-index">03 / broadcast</p><h2 className="section-heading">Live signal</h2></div><Link href="/live" className="action-ghost">Open viewer →</Link></div>
        <DashboardWidgetBoundary label="Live matches"><LiveGrid /></DashboardWidgetBoundary>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="surface-card overflow-hidden p-5 sm:p-6"><p className="section-label">Community signal</p><h2 className="mt-2 font-display text-3xl uppercase">Trending now</h2><div className="mt-5"><DashboardWidgetBoundary label="Trending"><TrendingStrip /></DashboardWidgetBoundary></div></div>
        <div className="surface-card overflow-hidden p-5 sm:p-6"><p className="section-label">Personalized</p><h2 className="mt-2 font-display text-3xl uppercase">Recommended</h2><div className="mt-5"><DashboardWidgetBoundary label="Recommendations"><RecommendedStrip /></DashboardWidgetBoundary></div></div>
      </section>

      <DashboardWidgetBoundary label="Social pulse"><SocialPulseWidgets /></DashboardWidgetBoundary>

      <section className="surface-signal overflow-hidden p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="page-kicker text-signal-live">Commercial layer</p><h2 className="mt-1 font-display text-3xl uppercase">Plans are coming soon</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Explore Starter, Pro and Event pricing. Billing and subscriptions are not enabled yet.</p></div><div className="flex flex-wrap gap-2">{canManageOrganization && <Link href="/organization/settings" className="action-secondary">Branding</Link>}<Link href="/pricing" className="action-primary">View plans</Link></div></div></section>
    </div>
  );
}
