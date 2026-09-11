import { db } from "@/lib/db";

export type BroadcastAuthorization =
  | { ok: true; userId: string; tournamentId: string }
  | { ok: false; status: 403 | 404 };

/**
 * Broadcast controls are operator-only. The public OBS overlay stays unauthenticated,
 * but every command that can change the program is restricted to the tournament
 * organizer, organization owner, or an organization operator/admin.
 */
export async function authorizeBroadcastOperator(
  clerkUserId: string,
  tournamentId: string,
): Promise<BroadcastAuthorization> {
  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  if (!user) return { ok: false, status: 403 };

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      organizerId: true,
      organizationId: true,
      organization: { select: { ownerId: true } },
    },
  });

  if (!tournament) return { ok: false, status: 404 };

  const isOrganizer = tournament.organizerId === user.id;
  const isOrganizationOwner = tournament.organization.ownerId === user.id;

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: tournament.organizationId,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  const memberRole = String(membership?.role ?? "").toUpperCase();
  const isOperator = memberRole === "OWNER" || memberRole === "ADMIN" || memberRole === "OPERATOR";

  if (!isOrganizer && !isOrganizationOwner && !isOperator) {
    return { ok: false, status: 403 };
  }

  return { ok: true, userId: user.id, tournamentId: tournament.id };
}
