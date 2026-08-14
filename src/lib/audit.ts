import { db } from "@/lib/db";

/**
 * Best-effort operator audit trail. Audit failures must never make a
 * successful streaming or bracket mutation fail.
 */
export async function writeAuditLog(input: {
  tournamentId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        tournamentId: input.tournamentId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record operator event", error);
  }
}
