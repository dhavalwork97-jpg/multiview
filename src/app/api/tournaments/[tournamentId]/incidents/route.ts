import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentView, requireTournamentManage } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("INFO"), title: z.string().trim().min(2).max(160), details: z.string().trim().max(4000).optional() });

export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try { await requireTournamentView(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const incidents = await db.tournamentIncident.findMany({ where: { tournamentId }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ incidents });
}

export async function POST(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let user;
  try { user = (await requireTournamentManage(tournamentId)).user; } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { organizationId: true } });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const incident = await db.tournamentIncident.create({ data: { ...body.data, tournamentId, organizationId: tournament.organizationId, createdById: user.id } });
  await writeAuditLog({ tournamentId, actorUserId: user.id, action: "INCIDENT_CREATED", entityType: "incident", entityId: incident.id, metadata: { severity: incident.severity, title: incident.title } });
  return NextResponse.json({ incident }, { status: 201 });
}
