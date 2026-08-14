import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const DEFAULT_BUDGET = 3000;

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const ledger = await db.youTubeQuotaLedger.findUnique({ where: { dayKey } });
  const configured = Number(process.env.YOUTUBE_DAILY_QUOTA_BUDGET ?? DEFAULT_BUDGET);
  const budget = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_BUDGET;

  return NextResponse.json({
    dayKey,
    budget,
    used: ledger?.units ?? 0,
    remaining: Math.max(0, budget - (ledger?.units ?? 0)),
    blockedUntil: ledger?.blockedUntil?.toISOString() ?? null,
  });
}
