import { NextResponse } from "next/server";
import { requireTournamentView } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try {
    await requireTournamentView(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await db.auditLog.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
  });

  return NextResponse.json({ events });
}
