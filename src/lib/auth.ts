import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Resolves the current Clerk session into our app-level User row.
 * Returns null if signed out. This is the single place API routes and
 * server components should call to get "who is this and what can they do" —
 * keeps the clerkId <-> User mapping in one spot.
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db.user.findUnique({ where: { clerkId } });
  return user;
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

/**
 * Throws if there's no signed-in user, or the signed-in user's role isn't
 * in `allowedRoles`. Use at the top of route handlers / server actions that
 * need to gate on role (e.g. only ORGANIZER/ADMIN can create tournaments).
 */
export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (!allowedRoles.includes(user.role)) throw new ForbiddenError();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}


/** Require that the signed-in organizer owns a tournament. ADMIN bypasses ownership. */
export async function requireTournamentAccess(tournamentId: string) {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  if (user.role === "ADMIN") return user;
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { organizerId: true } });
  if (!tournament) throw new ForbiddenError("Tournament not found");
  if (tournament.organizerId !== user.id) throw new ForbiddenError("You do not have access to this tournament");
  return user;
}
