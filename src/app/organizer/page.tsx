import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";
import OrganizerCommandDeck from "@/components/organizer/OrganizerCommandDeck";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readinessScore(tournament: {
  publicEnabled: boolean;
  matches: number;
  competitors: number;
  stations: number;
  incidents: number;
}) {
  const checks = [
    tournament.matches > 0,
    tournament.competitors > 0,
    tournament.stations > 0,
    tournament.publicEnabled,
    tournament.incidents === 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default async function OrganizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed =
    user.role === "ADMIN" ||
    user.role === "ORGANIZER" ||
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN";
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
      _count: {
        select: {
          matches: true,
          entrants: true,
          teams: true,
          stations: true,
          incidents: true,
        },
      },
      incidents: { where: { status: "OPEN" }, select: { id: true }, take: 1 },
    },
  });

  const canManageOrganization =
    user.role === "ADMIN" ||
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN";
  const canAccessAdmin = user.role === "ADMIN" || user.role === "ORGANIZER";
  const canCreateTournament = canAccessAdmin || canManageOrganization;
  const liveCount = tournaments.filter((t) => String(t.status).toUpperCase() === "LIVE").length;
  const upcomingCount = tournaments.filter(
    (t) => String(t.status).toUpperCase() !== "COMPLETED" && t.startDate > new Date(),
  ).length;
  const openIncidentCount = tournaments.filter((t) => t.incidents.length > 0).length;

  return (
    <OrganizerCommandDeck
      tournaments={tournaments.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        status: String(t.status),
        startDate: t.startDate.toISOString(),
        publicEnabled: t.publicEnabled,
        matches: t._count.matches,
        competitors: t._count.entrants + t._count.teams,
        stations: t._count.stations,
        incidents: t.incidents.length,
        readiness: readinessScore({
          publicEnabled: t.publicEnabled,
          matches: t._count.matches,
          competitors: t._count.entrants + t._count.teams,
          stations: t._count.stations,
          incidents: t.incidents.length,
        }),
      }))}
      canCreateTournament={canCreateTournament}
      canManageOrganization={canManageOrganization}
      liveCount={liveCount}
      upcomingCount={upcomingCount}
      openIncidentCount={openIncidentCount}
    />
  );
}
