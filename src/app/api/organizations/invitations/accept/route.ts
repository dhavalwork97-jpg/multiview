import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashInvitationToken } from "@/lib/organization";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before accepting an invitation" }, { status: 401 });
  const body = await req.json().catch(() => null) as { token?: string } | null;
  if (!body?.token) return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
  const invitation = await db.organizationInvitation.findUnique({ where: { tokenHash: hashInvitationToken(body.token) } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) return NextResponse.json({ error: "Invitation is invalid or expired" }, { status: 400 });
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json({ error: "This invitation was issued to a different email address" }, { status: 403 });
  const appRole = invitation.role === "ADMIN" ? "ADMIN" : invitation.role === "OPERATOR" ? "ORGANIZER" : user.role;
  await db.$transaction([
    db.organizationMember.upsert({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId: user.id } }, update: { role: invitation.role }, create: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role } }),
    db.organizationInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
    db.user.update({ where: { id: user.id }, data: { role: appRole } }),
  ]);
  return NextResponse.json({ ok: true, organizationId: invitation.organizationId, role: invitation.role });
}
