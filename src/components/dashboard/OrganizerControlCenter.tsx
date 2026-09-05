import Link from "next/link";
import type { OrganizationRole } from "@prisma/client";

export function OrganizerControlCenter({
  role,
  tournamentCount,
  canCreateTournament,
  canManageOrganization,
  canAccessAdmin,
}: {
  role: OrganizationRole | "ADMIN" | null;
  tournamentCount: number;
  canCreateTournament: boolean;
  canManageOrganization: boolean;
  canAccessAdmin: boolean;
}) {
  const links: Array<[string, string]> = [
    ...(canCreateTournament ? [["/admin/tournaments/new", "Create tournament"] as [string, string]] : []),
    ["/dashboard/team", "Team"],
    ["/tournaments", "Events"],
    ...(canManageOrganization ? [["/organization/settings", "Organization"] as [string, string]] : []),
    ...(canAccessAdmin ? [["/admin", "Admin"] as [string, string]] : []),
    ["/multiview", "Live / Multi-View"],
  ];

  return (
    <section className="surface-card mb-10 border-signal-live/30 bg-signal-live/[0.04] p-5 sm:p-6">
      <p className="page-kicker text-signal-live">Organizer control center</p>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="page-title text-3xl">Run the competition</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Create events, manage stations and teams, monitor analytics, and operate live tournament workflows from one workspace.
          </p>
        </div>
        <span className="status-neutral">{role === "ADMIN" ? "Platform admin" : role ?? "Organizer"}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="action-secondary flex min-h-14 items-center justify-center text-center">
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-arena-700 pt-4 text-xs text-ink-faint">
        <span>{tournamentCount} tournament{tournamentCount === 1 ? "" : "s"} in your workspace</span>
        <Link href="/admin/tournaments" className="font-mono uppercase tracking-wide hover:text-signal-live">Open management</Link>
      </div>
    </section>
  );
}
