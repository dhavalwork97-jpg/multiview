import { redirect } from "next/navigation";
import Link from "next/link";
import {
  canAdminTournamentRole,
  canOperateTournamentRole,
  getCurrentUser,
  isOrganizerDashboardRole,
  resolveDashboardRole,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { isPremium, trialDaysRemaining } from "@/lib/billing";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OrganizerDashboard } from "@/app/dashboard/OrganizerDashboard";
import { ViewerDashboard } from "@/app/dashboard/ViewerDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardData = {
  dashboardRole: ReturnType<typeof resolveDashboardRole>;
  canCreateTournament: boolean;
  canManageOrganization: boolean;
  canAccessAdmin: boolean;
  tournaments: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
    startDate: Date;
  }>;
  dataWarning: boolean;
};

async function loadDashboardData(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
): Promise<DashboardData> {
  try {
    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true, role: true },
      orderBy: { createdAt: "asc" },
    });

    const dashboardRole = resolveDashboardRole(
      user.role,
      memberships.map((membership) => membership.role),
    );
    const isPlatformAdmin = user.role === "ADMIN";
    const canCreateTournament =
      isPlatformAdmin || user.role === "ORGANIZER" || canOperateTournamentRole(dashboardRole);
    const canManageOrganization =
      isPlatformAdmin ||
      user.role === "ORGANIZER" ||
      canAdminTournamentRole(dashboardRole);
    const canAccessAdmin = isPlatformAdmin || user.role === "ORGANIZER";
    const organizationIds = memberships.map(
      (membership) => membership.organizationId,
    );

    const tournaments = await db.tournament.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : { organizationId: { in: organizationIds } },
      orderBy: { startDate: "desc" },
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        startDate: true,
      },
    });

    return {
      dashboardRole,
      canCreateTournament,
      canManageOrganization,
      canAccessAdmin,
      tournaments,
      dataWarning: false,
    };
  } catch (error) {
    console.error("FGC Stream dashboard data load failed", error);
    return {
      dashboardRole: user.role === "ADMIN" ? "ADMIN" : null,
      canCreateTournament: user.role === "ADMIN" || user.role === "ORGANIZER",
      canManageOrganization: user.role === "ADMIN" || user.role === "ORGANIZER",
      canAccessAdmin: user.role === "ADMIN" || user.role === "ORGANIZER",
      tournaments: [],
      dataWarning: true,
    };
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const {
    dashboardRole,
    canCreateTournament,
    canManageOrganization,
    canAccessAdmin,
    tournaments,
    dataWarning,
  } = await loadDashboardData(user);
  const isOrganizer = isOrganizerDashboardRole(user.role, dashboardRole);

  return (
    <main className="page-shell">
      <div className="page-container">
        {dataWarning && (
          <div
            className="mb-4 rounded-card border border-signal-warn/40 bg-signal-warn/[0.06] px-4 py-3 text-sm text-ink-muted"
            role="status"
          >
            Some dashboard data is temporarily unavailable. You can still use
            the rest of FGC Stream.
          </div>
        )}

        <header className="surface-card mb-8 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="page-kicker">
                {isOrganizer ? "Competition workspace" : "Fan workspace"}
              </p>
              <h1 className="page-title mt-1 truncate text-3xl">
                Welcome back, {user.displayName ?? user.username}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchBar />
              <NotificationBell />
              {isOrganizer && (
                <Link href="/dashboard/team" className="action-secondary">
                  Team
                </Link>
              )}
              <Link href="/pricing" className="action-secondary">
                {isPremium(user)
                  ? `Plans · ${trialDaysRemaining(user)}d`
                  : "Plans"}
              </Link>
              {canCreateTournament && (
                <Link href="/admin/tournaments/new" className="action-primary">
                  Create tournament
                </Link>
              )}
            </div>
          </div>
        </header>

        {isOrganizer ? (
          <OrganizerDashboard
            user={user}
            role={dashboardRole}
            tournaments={tournaments}
            canCreateTournament={canCreateTournament}
            canManageOrganization={canManageOrganization}
            canAccessAdmin={canAccessAdmin}
            dataWarning={dataWarning}
          />
        ) : (
          <ViewerDashboard />
        )}
      </div>
    </main>
  );
}
