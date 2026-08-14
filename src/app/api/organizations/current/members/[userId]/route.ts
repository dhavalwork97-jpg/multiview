import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreatePersonalOrganization, requireOrganizationRole } from "@/lib/organization";
import { db } from "@/lib/db";

const schema = z.object({ role: z.enum(["OWNER", "ADMIN", "OPERATOR", "VIEWER"]) });
export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await getOrCreatePersonalOrganization(user.id);
  try { await requireOrganizationRole(org.id, "OWNER"); } catch { return NextResponse.json({ error: "Owner access required" }, { status: 403 }); }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  if (body.data.role === "OWNER" && userId !== user.id) return NextResponse.json({ error: "Ownership transfer requires an explicit transfer workflow" }, { status: 409 });
  const member = await db.organizationMember.update({ where: { organizationId_userId: { organizationId: org.id, userId } }, data: { role: body.data.role } });
  return NextResponse.json({ member });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await getOrCreatePersonalOrganization(user.id);
  try { await requireOrganizationRole(org.id, "OWNER"); } catch { return NextResponse.json({ error: "Owner access required" }, { status: 403 }); }
  if (userId === user.id) return NextResponse.json({ error: "Owner cannot remove themselves" }, { status: 409 });
  await db.organizationMember.delete({ where: { organizationId_userId: { organizationId: org.id, userId } } });
  return NextResponse.json({ ok: true });
}
