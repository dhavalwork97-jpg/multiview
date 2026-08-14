import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { requireUser, ForbiddenError } from "@/lib/auth";
import type { OrganizationRole } from "@prisma/client";

export async function getOrCreatePersonalOrganization(userId: string) {
  const existing = await db.organization.findFirst({ where: { ownerId: userId } });
  if (existing) return existing;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true, username: true } });
  const base = (user.username || "organizer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "organizer";
  return db.$transaction(async (tx) => {
    const again = await tx.organization.findFirst({ where: { ownerId: userId } });
    if (again) return again;
    const org = await tx.organization.create({
      data: { name: `${user.displayName ?? user.username} Events`, slug: `${base}-${Date.now().toString(36)}`, ownerId: userId },
    });
    await tx.organizationMember.create({ data: { organizationId: org.id, userId, role: "OWNER" } });
    return org;
  });
}

export async function requireOrganizationRole(organizationId: string, minimum: OrganizationRole) {
  const user = await requireUser();
  if (user.role === "ADMIN") return { user, role: "ADMIN" as OrganizationRole };
  const member = await db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } } });
  if (!member) throw new ForbiddenError("You are not a member of this organization");
  const rank: Record<OrganizationRole, number> = { VIEWER: 10, OPERATOR: 20, ADMIN: 30, OWNER: 40 };
  if (rank[member.role] < rank[minimum]) throw new ForbiddenError("Insufficient organization permissions");
  return { user, role: member.role };
}

export function createInvitationToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}


export async function getPrimaryOrganizationMembership(userId: string) {
  return db.organizationMember.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function requirePrimaryOrganizationRole(minimum: OrganizationRole) {
  const user = await requireUser();
  if (user.role === "ADMIN") return { user, organizationId: null, role: "ADMIN" as OrganizationRole };
  const membership = await getPrimaryOrganizationMembership(user.id);
  if (!membership) throw new ForbiddenError("No organization membership");
  const rank: Record<OrganizationRole, number> = { VIEWER: 10, OPERATOR: 20, ADMIN: 30, OWNER: 40 };
  if (rank[membership.role] < rank[minimum]) throw new ForbiddenError("Insufficient organization permissions");
  return { user, organizationId: membership.organizationId, role: membership.role };
}
