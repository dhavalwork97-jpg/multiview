import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// POST /api/admin/users/:userId/role — the in-app replacement for the
// "manually edit Prisma Studio + hand-edit Clerk's publicMetadata.role"
// workflow. Writes to BOTH Postgres `User.role` and Clerk's
// `publicMetadata.role` so the two never drift apart: middleware.ts reads
// `sessionClaims.metadata.role` (from Clerk) to gate /admin, while API
// route handlers read `User.role` (from Postgres) via requireRole(). A user
// with only one of the two set either gets silently redirected out of
// /admin despite the DB saying they're an organizer, or vice versa.
const roleSchema = z.object({
  role: z.enum(["VIEWER", "PLAYER", "ORGANIZER", "ADMIN"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  let actor;
  try {
    actor = await requireRole(["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { role } = parsed.data;

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Guard against an admin locking themselves (or the last admin) out of
  // /admin by demoting their own account.
  if (targetUser.id === actor.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "You can't change your own role away from ADMIN" },
      { status: 400 }
    );
  }

  // Clerk first: it's the piece middleware actually gates on, and it's the
  // one that was previously done by hand and easiest to forget. If it
  // fails, we bail before touching Postgres so the two never disagree.
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(targetUser.clerkId, {
      publicMetadata: { role },
    });
  } catch (err) {
    console.error("[admin/users/role] Clerk metadata update failed", err);
    return NextResponse.json(
      { error: "Failed to update Clerk metadata — role was not changed" },
      { status: 502 }
    );
  }

  try {
    const updated = await db.user.update({
      where: { id: targetUser.id },
      data: { role },
    });
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error(
      "[admin/users/role] Postgres update failed AFTER Clerk metadata was already set — " +
        `user ${targetUser.id} (clerk: ${targetUser.clerkId}) is now desynced, Clerk says ${role}`,
      err
    );
    return NextResponse.json(
      {
        error:
          "Clerk was updated but the database write failed — retry this action to resync",
      },
      { status: 500 }
    );
  }
}
