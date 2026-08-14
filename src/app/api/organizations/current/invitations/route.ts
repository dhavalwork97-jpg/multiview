import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createInvitationToken, requireOrganizationRole } from "@/lib/organization";

const schema = z.object({ email: z.string().email().max(320), role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).default("OPERATOR") });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await db.organizationMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!membership) return NextResponse.json({ error: "No organization found" }, { status: 404 });
  try { await requireOrganizationRole(membership.organizationId, "ADMIN"); } catch { return NextResponse.json({ error: "Insufficient organization permissions" }, { status: 403 }); }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { token, tokenHash } = createInvitationToken();
  const invitation = await db.organizationInvitation.create({ data: { organizationId: membership.organizationId, email: body.data.email.toLowerCase(), role: body.data.role, tokenHash, invitedById: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, select: { id: true, email: true, role: true, expiresAt: true } });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  return NextResponse.json({ invitation, inviteUrl: `${base}/invite/${token}` }, { status: 201 });
}
