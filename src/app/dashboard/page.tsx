import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { isPremium, trialDaysRemaining } from "@/lib/billing";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const isOrganizer = user.role === "ADMIN" || user.role === "ORGANIZER";
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id },
    select: { organizationId: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const organizationIds = memberships.map((membership) => membership.organizationId);
  const canManageOrganization =
    user.role === "ADMIN" ||
    memberships.some((membership) => membership.role === "ADMIN" || membership.role === "OWNER");
  const canCreateTournament = isOrganizer || canManageOrganization;

  const tournaments = await db.tournament.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : user.role === "ORGANIZER"
          ? {
              OR: [
                { organizerId: user.id },
                ...(organizationIds.length > 0 ? [{ organizationId: { in: organizationIds } }] : []),
              ],
            }
          : organizationIds.length > 0
            ? { organizationId: { in: organizationIds } }
            : { id: "__no_access__" },
    orderBy: { startDate: "desc" },
    take: 8,
    select: { id: true, slug: true, name: true, status: true, startDate: true },
  });

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="surface-card mb-8 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="page-kicker">{isOrganizer ? "Competition workspace" : "Fan workspace"}</p>
              <h1 className="page-title mt-1 truncate text-3xl">Welcome back, {user.displayName ?? user.username}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchBar />
              <NotificationBell />
              {isOrganizer && <Link href="/organizer" className="action-secondary">Organizer workspace</Link>}
              {canManageOrganization && <Link href="/organization/settings" className="action-secondary">Organization</Link>}
              <Link href="/pricing" className="action-secondary">{isPremium(user) ? `Plans · ${trialDaysRemaining(user)}d` : "Plans"}</Link>
              {canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}
            </div>
          </div>
        </header>

        {isOrganizer ? (
          <section className="surface-card p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="page-kicker">Organizer overview</p>
                <h2 className="mt-1 font-display text-2xl uppercase">Your competition workspace</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  Create and manage tournaments from the dedicated organizer workspace while keeping the viewer experience separate.
                </p>
              </div>
              <Link href="/organizer" className="action-primary">Open organizer workspace</Link>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="surface-quiet p-4"><p className="metric-label">Tournaments</p><p className="metric-value mt-2">{tournaments.length}</p></div>
              <div className="surface-quiet p-4"><p className="metric-label">Organizations</p><p className="metric-value mt-2">{organizationIds.length}</p></div>
              <div className="surface-quiet p-4"><p className="metric-label">Role</p><p className="metric-value mt-2">{user.role}</p></div>
              <div className="surface-quiet p-4"><p className="metric-label">Management</p><p className="metric-value mt-2">Enabled</p></div>
            </div>
          </section>
        ) : (
          <section className="surface-card p-5 sm:p-6">
            <p className="page-kicker">Fan workspace</p>
            <h2 className="mt-1 font-display text-2xl uppercase">Watch, follow and interact</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Browse live competition and use the viewer experience for chat, reactions, predictions, watch parties and community activity.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/live" className="action-primary">Watch live</Link>
              <Link href="/matches" className="action-secondary">Browse matches</Link>
              <Link href="/community" className="action-secondary">Community</Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
