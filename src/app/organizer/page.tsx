import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readinessLabel(value: number) {
  if (value >= 80) return "Ready";
  if (value >= 50) return "Attention";
  return "Setup needed";
}

export default async function OrganizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const tournaments = await db.tournament.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { organizationId: membership?.organizationId ?? "__none__" },
              ...(user.role === "ORGANIZER" ? [{ organizerId: user.id }] : []),
            ],
          },
    orderBy: { startDate: "desc" },
    take: 12,
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      startDate: true,
      publicEnabled: true,
      _count: { select: { matches: true, entrants: true, teams: true, stations: true, incidents: true } },
      incidents: { where: { status: "OPEN" }, select: { id: true }, take: 1 },
    },
  });

  const canManageOrganization = user.role === "ADMIN" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  const canAccessAdmin = user.role === "ADMIN" || user.role === "ORGANIZER";
  const canCreateTournament = canAccessAdmin || canManageOrganization;
  const liveCount = tournaments.filter((t) => String(t.status).toUpperCase() === "LIVE").length;
  const upcomingCount = tournaments.filter((t) => String(t.status).toUpperCase() !== "COMPLETED" && t.startDate > new Date()).length;
  const openIncidentCount = tournaments.filter((t) => t.incidents.length > 0).length;

  return (
    <div className="page-container max-w-none">
      <header className="mb-8 flex flex-col gap-3 border-b border-arena-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker text-signal-live">Phase 16 · Operations</p>
          <h2 className="page-title mt-1 text-4xl">Run your competitions</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">A live operations command center for readiness, match flow, broadcast capacity and event issues.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}
          <Link href="/dashboard" className="action-secondary">Viewer dashboard</Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="surface-card p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Tournaments</p><p className="mt-2 font-display text-3xl">{tournaments.length}</p><p className="mt-1 text-xs text-ink-muted">Events in your workspace</p></div>
        <div className="surface-card p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Live now</p><p className="mt-2 font-display text-3xl">{liveCount}</p><p className="mt-1 text-xs text-ink-muted">Currently marked live</p></div>
        <div className="surface-card p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Upcoming</p><p className="mt-2 font-display text-3xl">{upcomingCount}</p><p className="mt-1 text-xs text-ink-muted">Scheduled ahead</p></div>
        <div className="surface-card p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Open issues</p><p className="mt-2 font-display text-3xl">{openIncidentCount}</p><p className="mt-1 text-xs text-ink-muted">Events needing attention</p></div>
        <div className="surface-card p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Access</p><p className="mt-2 font-display text-3xl">{canAccessAdmin ? "Admin" : "Org"}</p><p className="mt-1 text-xs text-ink-muted">{canManageOrganization ? "Organization management enabled" : "Competition operations enabled"}</p></div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-arena-800 p-5">
            <div><p className="page-kicker">Operations queue</p><h3 className="mt-1 font-display text-2xl uppercase">Tournament readiness</h3></div>
            <Link href="/tournaments" className="action-secondary">View all</Link>
          </div>
          {tournaments.length === 0 ? (
            <div className="p-8 text-sm text-ink-muted">No tournaments are available for this organization yet.</div>
          ) : (
            <div className="divide-y divide-arena-800">
              {tournaments.map((tournament) => {
                const checks = [
                  tournament._count.matches > 0,
                  tournament._count.entrants + tournament._count.teams > 0,
                  tournament._count.stations > 0,
                  tournament.publicEnabled,
                  tournament.incidents.length === 0,
                ];
                const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
                const readiness = readinessLabel(score);
                return (
                  <div key={tournament.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-ink">{tournament.name}</p><span className="rounded-full border border-arena-700 px-2 py-0.5 font-mono text-[9px] uppercase text-ink-faint">{String(tournament.status)}</span><span className="rounded-full border border-arena-700 px-2 py-0.5 font-mono text-[9px] uppercase text-ink-faint">{readiness}</span></div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{tournament.startDate.toLocaleDateString()} · {tournament._count.matches} matches · {tournament._count.entrants + tournament._count.teams} competitors · {tournament._count.stations} stations</p>
                      </div>
                      <div className="flex shrink-0 gap-2"><Link href={`/tournaments/${tournament.slug ?? tournament.id}`} className="action-secondary">Open</Link>{canCreateTournament && <Link href={`/admin/tournaments/${tournament.id}`} className="action-secondary">Manage</Link>}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-1" aria-label={`${score}% tournament readiness`}>
                      {checks.map((ready, index) => <span key={index} className={`h-1.5 rounded-full ${ready ? "bg-signal-live" : "bg-arena-700"}`} />)}
                    </div>
                    <p className="mt-2 text-[11px] text-ink-faint">Readiness checks: matches, competitors, broadcast stations, public event, open incidents.</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-5"><p className="page-kicker">Operations</p><h3 className="mt-1 font-display text-2xl uppercase">Quick actions</h3><div className="mt-4 grid gap-2">{canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary w-full text-center">Create tournament</Link>}<Link href="/teams" className="action-secondary w-full text-center">Manage teams</Link><Link href="/players" className="action-secondary w-full text-center">Manage players</Link><Link href="/multiview" className="action-secondary w-full text-center">Open broadcast</Link>{canManageOrganization && <Link href="/organization/settings" className="action-secondary w-full text-center">Organization settings</Link>}</div></div>
          <div className="surface-card p-5"><p className="page-kicker">Next</p><h3 className="mt-1 font-display text-2xl uppercase">Event control</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Open a tournament to move from readiness into scoring, stations, broadcast control, standings, analytics and incident handling.</p></div>
        </aside>
      </section>
    </div>
  );
}
