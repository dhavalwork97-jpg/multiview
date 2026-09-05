import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";
import { OrganizerDashboard } from "@/components/dashboard/OrganizerDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const organizationIds = membership ? [membership.organizationId] : [];
  const tournaments = await db.tournament.findMany({
    where: user.role === "ADMIN" ? {} : { organizationId: { in: organizationIds } },
    orderBy: { startDate: "desc" },
    take: 12,
    select: { id: true, slug: true, name: true, status: true, startDate: true },
  });

  const canManageOrganization = user.role === "ADMIN" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  const canAccessAdmin = user.role === "ADMIN" || user.role === "ORGANIZER";
  const canCreateTournament = canAccessAdmin || canManageOrganization;

  return (
    <div className="page-container max-w-none">
      <header className="mb-8 flex flex-col gap-3 border-b border-arena-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker text-signal-live">Organizer workspace</p>
          <h2 className="page-title mt-1 text-4xl">Run your competitions</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">One focused workspace for tournament operations, broadcast control, competitors and event analytics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateTournament && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}
          <Link href="/pricing" className="action-secondary">Plans</Link>
        </div>
      </header>

      <OrganizerDashboard
        user={{ displayName: user.displayName, username: user.username, role: user.role }}
        role={membership?.role ?? (user.role === "ADMIN" ? "ADMIN" : null)}
        tournaments={tournaments}
        canCreateTournament={canCreateTournament}
        canManageOrganization={canManageOrganization}
        canAccessAdmin={canAccessAdmin}
        dataWarning={false}
      />
    </div>
  );
}
