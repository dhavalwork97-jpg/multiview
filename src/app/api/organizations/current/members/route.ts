import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireOrganizationRole } from "@/lib/organization";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await db.organizationMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!membership) return NextResponse.json({ error: "No organization found" }, { status: 404 });
  const org = membership.organizationId;
  try { await requireOrganizationRole(org, "VIEWER"); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const members = await db.organizationMember.findMany({ where: { organizationId: org }, orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, username: true, displayName: true, email: true, role: true } } } });
  return NextResponse.json({ members });
}
