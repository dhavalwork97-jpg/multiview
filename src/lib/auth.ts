import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { OrganizationRole, Role } from "@prisma/client";

const ORG_ROLE_RANK: Record<OrganizationRole, number> = {
  VIEWER: 10,
  OPERATOR: 20,
  ADMIN: 30,
  OWNER: 40,
};

async function ensureLocalUser(clerkId: string) {
  const existing = await db.user.findUnique({
    where: { clerkId },
  });

  if (existing) return existing;

  const clerkUser = await currentUser();

  if (!clerkUser || clerkUser.id !== clerkId) {
    return null;
  }

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw new Error("Authenticated Clerk user has no email address");
  }

  const baseUsername =
    clerkUser.username?.trim() ||
    primaryEmail.split("@")[0]?.trim() ||
    `user-${clerkId.slice(-8)}`;

  let username = baseUsername;

  const usernameOwner = await db.user.findUnique({
    where: { username },
    select: { id: true, clerkId: true },
  });

  if (usernameOwner && usernameOwner.clerkId !== clerkId) {
    username = `${baseUsername}-${clerkId.slice(-8)}`;
  }

  const displayName =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  return db.$transaction(async (tx) => {
    const byClerkId = await tx.user.findUnique({
      where: { clerkId },
    });

    if (byClerkId) return byClerkId;

    const byEmail = await tx.user.findUnique({
      where: { email: primaryEmail },
    });

    if (byEmail) {
      return tx.user.update({
        where: { id: byEmail.id },
        data: {
          clerkId,
          email: primaryEmail,
          username,
          displayName,
          avatarUrl: clerkUser.imageUrl ?? null,
        },
      });
    }

    const byUsername = await tx.user.findUnique({
      where: { username },
    });

    if (byUsername) {
      username = `${baseUsername}-${clerkId.slice(-8)}`;
    }

    return tx.user.create({
      data: {
        clerkId,
        email: primaryEmail,
        username,
        displayName,
        avatarUrl: clerkUser.imageUrl ?? null,
      },
    });
  });
}

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) return null;

  return ensureLocalUser(clerkId);
}

export class UnauthorizedError extends Error {
  constructor(message = "Not signed in") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentUser();

  if (!user) throw new UnauthorizedError();

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }

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
    return {
      user,
      organizationId: null as string | null,
      role: "OWNER" as OrganizationRole,
      isPlatformAdmin: true,
    };
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizationId: true },
  });

  if (!tournament) {
    throw new ForbiddenError("Tournament not found");
  }

  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: tournament.organizationId,
        userId: user.id,
      },
    },
    select: {
      organizationId: true,
      role: true,
    },
  });

  if (!member) {
    throw new ForbiddenError(
      "You do not have access to this tournament",
    );
  }

  return {
    user,
    organizationId: member.organizationId,
    role: member.role,
    isPlatformAdmin: false,
  };
}

export async function requireTournamentView(tournamentId: string) {
  return getTournamentAccess(tournamentId);
}

export async function requireTournamentManage(tournamentId: string) {
  const access = await getTournamentAccess(tournamentId);

  if (
    !access.isPlatformAdmin &&
    ORG_ROLE_RANK[access.role] < ORG_ROLE_RANK.OPERATOR
  ) {
    throw new ForbiddenError("Viewer access is read-only");
  }

  return access;
}

export async function requireTournamentAdmin(tournamentId: string) {
  const access = await getTournamentAccess(tournamentId);

  if (
    !access.isPlatformAdmin &&
    ORG_ROLE_RANK[access.role] < ORG_ROLE_RANK.ADMIN
  ) {
    throw new ForbiddenError(
      "Organization admin permission required",
    );
  }

  return access;
}

export async function requireTournamentAccess(tournamentId: string) {
  return requireTournamentManage(tournamentId);
}

export function canOperateTournamentRole(
  role: OrganizationRole | null | undefined,
) {
  return !!role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.OPERATOR;
}

export function canAdminTournamentRole(
  role: OrganizationRole | null | undefined,
) {
  return !!role && ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.ADMIN;
}

export type DashboardRole = OrganizationRole | "ADMIN" | null;

export function resolveDashboardRole(
  userRole: Role,
  organizationRoles: OrganizationRole[],
): DashboardRole {
  if (userRole === "ADMIN") return "ADMIN";

  const rankedRole = organizationRoles.reduce<OrganizationRole | null>(
    (highest, role) =>
      !highest || ORG_ROLE_RANK[role] > ORG_ROLE_RANK[highest]
        ? role
        : highest,
    null,
  );

  return rankedRole;
}

export function isOrganizerDashboardRole(
  userRole: Role,
  dashboardRole: DashboardRole,
) {
  return (
    userRole === "ADMIN" ||
    userRole === "ORGANIZER" ||
    (dashboardRole !== null &&
      dashboardRole !== "VIEWER" &&
      canOperateTournamentRole(dashboardRole))
  );
}
