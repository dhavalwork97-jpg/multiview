import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { OrganizationRole, Role } from "@prisma/client";

const ORG_ROLE_RANK: Record<OrganizationRole, number> = {
  VIEWER: 10,
  OPERATOR: 20,
  ADMIN: 30,
  OWNER: 40,
};

/**
 * Return the application's user record for the active Clerk session.
 *
 * Clerk authentication and our Prisma user mirror are intentionally separate.
 * A newly created Clerk account can reach the app before the Clerk webhook has
 * been delivered, so do not redirect an authenticated user back to /sign-in
 * merely because the mirror row is not present yet. Provision the row from
 * Clerk as a safe fallback, while keeping the webhook as the normal sync path.
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses.find(
    (item) => item.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const username =
    clerkUser.username?.trim() ||
    email.split("@")[0]?.trim() ||
    `user-${clerkId.slice(-8)}`;

  // Username/email are globally unique in our schema. Prefer the existing
  // record if Clerk has been linked to an already-provisioned account.
  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    return db.user.update({
      where: { id: byEmail.id },
      data: { clerkId },
    });
  }

  const byUsername = await db.user.findUnique({ where: { username } });
  if (byUsername) {
    return db.user.update({
      where: { id: byUsername.id },
      data: { clerkId, email },
    });
  }

  return db.user.create({
    data: {
      clerkId,
      email,
      username,
      displayName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
  });
}

export class UnauthorizedError extends Error {
  constructor(message = "Not signed in") { super(message); this.name = "UnauthorizedError"; }
}
export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") { super(message); this.name = "ForbiddenError"; }
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (!allowedRoles.includes(user.role)) throw new ForbiddenError();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function getTournamentAccess(tournamentId: string) {
  const user = await requireUser();
  if (user.role === "ADMIN") {
    return { user, organizationId: null as string | null, role: "OWNER" as OrganizationRole, isPlatformAdmin: true };
  }
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizationId: true },
  });
  if (!tournament) throw new ForbiddenError("Tournament not found");
  const member = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: tournament.organizationId, userId: user.id } },
    select: { organizationId: true, role: true },
  });
  if (!member) throw new ForbiddenError("You do not have access to this tournament");
  return { user, organizationId: member.organizationId, role: member.role, isPlatformAdmin: false };
}

/** Read access: every organization member, including VIEWER. */
export async function requireTournamentView(tournamentId: string) {
  return getTournamentAccess(tournamentId);
}

/** Operational write access: OPERATOR, ADMIN, OWNER. */
export async function requireTournamentManage(tournamentId: string) {
  const access = await getTournamentAccess(tournamentId);
  if (!access.isPlatformAdmin && ORG_ROLE_RANK[access.role] < ORG_ROLE_RANK.OPERATOR) {
    throw new ForbiddenError("Viewer access is read-only");
  }
  return access;
}

/** Organization administration: ADMIN/OWNER only. */
export async function requireTournamentAdmin(tournamentId: string) {
  const access = await getTournamentAccess(tournamentId);
  if (!access.isPlatformAdmin && ORG_ROLE_RANK[access.role] < ORG_ROLE_RANK.ADMIN) {
    throw new ForbiddenError("Organization admin permission required");
  }
  return access;
}

/** Backwards-compatible name. Existing operational routes should use this. */
export async function requireTournamentAccess(tournamentId: string) {
  return requireTournamentManage(tournamentId);
}

export function canOperateTournamentRole(role: OrganizationRole | null | undefined) {
  return !!role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.OPERATOR;
}
export function canAdminTournamentRole(role: OrganizationRole | null | undefined) {
  return !!role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.ADMIN;
}
