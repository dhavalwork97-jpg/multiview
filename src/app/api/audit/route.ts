import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentView } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });

  try {
    await requireTournamentView(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20) || 20, 1), 50);
  const entries = await db.auditLog.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actorUserId: true,
    },
  });

  return NextResponse.json({ entries });
}
