import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(), severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(), title: z.string().trim().min(2).max(160).optional(), details: z.string().trim().max(4000).nullable().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ tournamentId: string; incidentId: string }> }) {
  const { tournamentId, incidentId } = await params;
  let user;
  try { user = await requireTournamentAccess(tournamentId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const existing = await db.tournamentIncident.findFirst({ where: { id: incidentId, tournamentId } });
  if (!existing) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  const data: { status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"; severity?: "INFO" | "WARNING" | "CRITICAL"; title?: string; details?: string | null; resolvedAt?: Date | null } = { ...body.data };
  if (body.data.status === "RESOLVED") data.resolvedAt = new Date();
  else if (body.data.status) data.resolvedAt = null;
  const incident = await db.tournamentIncident.update({ where: { id: incidentId }, data });
  await writeAuditLog({ tournamentId, actorUserId: user.id, action: "INCIDENT_UPDATED", entityType: "incident", entityId: incident.id, metadata: { status: incident.status, severity: incident.severity } });
  return NextResponse.json({ incident });
}
