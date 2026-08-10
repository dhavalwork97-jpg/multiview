import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/admin/users?q=... — backs the admin "promote user" UI. Deliberately
// gated to ADMIN only (not ORGANIZER) since this is the entry point for
// granting ORGANIZER/ADMIN access itself — an organizer shouldn't be able to
// mint more organizers or admins.
export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      clerkId: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
    },
  });

  return NextResponse.json({ users });
}
