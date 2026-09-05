import Link from "next/link";
import type { OrganizationRole } from "@prisma/client";
import { OrganizerControlCenter } from "@/components/dashboard/OrganizerControlCenter";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { TrendingStrip } from "@/components/dashboard/TrendingStrip";
import { RecommendedStrip } from "@/components/dashboard/RecommendedStrip";
import { SocialPulseWidgets } from "@/components/dashboard/SocialPulseWidgets";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";

type DashboardRole = OrganizationRole | "ADMIN" | null;

type Tournament = {
  id: string;
  slug: string;
  name: string;
  status: string;
  startDate: Date;
};

export function OrganizerDashboard({
  role,
  tournaments,
  canCreateTournament,
  canManageOrganization,
  canAccessAdmin,
  dataWarning,
  premium,
  trialDays,
}: {
  role: DashboardRole;
  tournaments: Tournament[];
  canCreateTournament: boolean;
  canManageOrganization: boolean;
  canAccessAdmin: boolean;
  dataWarning: boolean;
  premium: boolean;
  trialDays: number;
}) {
  const tools: Array<[string, string]> = [
    ["/tournaments", "Tournaments"],
    ["/teams", "Teams"],
    ["/players", "Players"],
    ["/multiview", "Live / Multi-View"],
    ...(canManageOrganization ? [["/organization/settings", "Organization"] as [string, string]] : []),
    ...(canAccessAdmin ? [["/admin", "Admin"] as [string, string]] : []),
  ];

  return (
    <>
      <OrganizerControlCenter
        role={role}
        tournamentCount={tournaments.length}
        canCreateTournament={canCreateTournament}
        canManageOrganization={canManageOrganization}
        canAccessAdmin={canAccessAdmin}
      />

      <section className="surface-card mb-10 border-signal-live/30 bg-signal-live/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="page-kicker text-signal-live">Organizer plan</p>
            <h2 className="mt-1 font-display text-2xl uppercase tracking-wide">
              {premium ? (trialDays > 0 ? `${trialDays} days left in your free trial` : "Premium workspace active") : "Start your 14-day free trial"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              {premium && trialDays > 0
                ? "Keep building your event with the full organizer workflow. Paid billing is not enabled yet, so you will not be charged when the trial ends."
                : "Test tournament control, station management and the public broadcast workflow before paid plans launch. No payment required."
              }
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/pricing" className="action-secondary">Compare plans</Link>
            {!premium && <Link href="/pricing#plans" className="action-primary">Start free trial</Link>}
          </div>
        </div>
      </section>

      <section className="mb-10"><div className="mb-3"><p className="section-label">For you</p><h2 className="page-title mt-1 text-2xl">Recommended</h2></div><DashboardWidgetBoundary label="Recommendations"><RecommendedStrip /></DashboardWidgetBoundary></section>
      <section className="mb-10"><div className="mb-3"><p className="section-label">Community signal</p><h2 className="page-title mt-1 text-2xl">Trending</h2></div><DashboardWidgetBoundary label="Trending"><TrendingStrip /></DashboardWidgetBoundary></section>
      <DashboardWidgetBoundary label="Social pulse"><SocialPulseWidgets /></DashboardWidgetBoundary>

      <section className="surface-card mb-10 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-label">Quick access</p><h2 className="page-title mt-1 text-2xl">Organizer tools</h2></div>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{tools.map(([href, label]) => <Link key={href} href={href} className="surface-card surface-card-interactive flex min-h-14 items-center justify-center border-arena-700 bg-arena-950 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</Link>)}</div></section>
      <section className="mb-10"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="section-label">Workspace events</p><h2 className="page-title mt-1 text-2xl">Your tournaments</h2></div></div>{tournaments.length === 0 ? <div className="empty-state"><p>{dataWarning ? "Tournament data is temporarily unavailable." : "You haven't created a tournament yet."}</p>{canCreateTournament && <Link href="/admin/tournaments/new" className="action-secondary mt-3">Create your first tournament</Link>}</div> : <ul className="surface-card divide-y divide-arena-700 overflow-hidden">{tournaments.map((tournament) => <li key={tournament.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/admin/tournaments/${tournament.id}`} className="font-display text-lg uppercase hover:text-signal-live">{tournament.name}</Link><span className={tournament.status === "LIVE" ? "status-live" : "status-neutral"} aria-label={`Status: ${tournament.status}`}>{tournament.status === "LIVE" && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" aria-hidden="true" />}{tournament.status}</span></div><p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{new Date(tournament.startDate).toLocaleDateString()}</p></div><div className="flex flex-wrap items-center gap-3"><Link href={`/e/${tournament.slug}`} className="font-mono text-[10px] uppercase tracking-wide text-ink-faint hover:text-ink">Public page</Link><Link href={`/admin/tournaments/${tournament.id}/analytics`} className="font-mono text-[10px] uppercase tracking-wide text-ink-faint hover:text-signal-live">Analytics</Link><Link href={`/admin/tournaments/${tournament.id}/control-room`} className="action-secondary">Manage stations</Link></div></li>)}</ul>}</section>
      <section><div className="mb-3"><p className="section-label">Live signal</p><h2 className="page-title mt-1 text-2xl">Live right now</h2></div><DashboardWidgetBoundary label="Live matches"><LiveGrid /></DashboardWidgetBoundary></section>
    </>
  );
}
