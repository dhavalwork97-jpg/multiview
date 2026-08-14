import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreatePersonalOrganization } from "@/lib/organization";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await db.organizationMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, include: { organization: true } });
  const organization = membership?.organization ?? await getOrCreatePersonalOrganization(user.id);
  const memberships = await db.organizationMember.findMany({ where: { userId: user.id }, include: { organization: { select: { id: true, name: true, slug: true } } } });
  return NextResponse.json({ organization, organizations: memberships.map((m) => ({ ...m.organization, role: m.role })) });
}
