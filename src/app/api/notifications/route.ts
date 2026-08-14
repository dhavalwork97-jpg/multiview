import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await db.organizationMember.findMany({ where: { userId: user.id }, select: { organizationId: true } });
    const notifications = await db.notification.findMany({ where: { organizationId: { in: memberships.map((m) => m.organizationId) }, OR: [{ userId: user.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 30 });
    return NextResponse.json({ notifications });
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const { id } = await req.json();
    const n = await db.notification.findUnique({ where: { id } });
    if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const member = await db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: n.organizationId, userId: user.id } } });
    if (!member && user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ notification: await db.notification.update({ where: { id }, data: { readAt: new Date() } }) });
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}
