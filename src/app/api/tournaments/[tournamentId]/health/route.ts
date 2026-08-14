import { NextResponse } from "next/server";
import { requireTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";

// Operational diagnostics only. This route intentionally performs no YouTube
// API calls, so opening the control room cannot consume YouTube quota.
export async function GET(_req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try {
    await requireTournamentAccess(tournamentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checks: Record<string, { status: "ok" | "warning" | "error"; detail: string }> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", detail: "Database reachable" };
  } catch {
    checks.database = { status: "error", detail: "Database unavailable" };
  }

  checks.redis = process.env.REDIS_URL
    ? { status: "ok", detail: "Realtime Redis configured" }
    : { status: "warning", detail: "REDIS_URL not configured; realtime fan-out is disabled" };

  checks.youtube = process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET
    ? { status: "ok", detail: "YouTube OAuth credentials configured" }
    : { status: "warning", detail: "YouTube OAuth credentials are incomplete" };

  checks.clerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
    ? { status: "ok", detail: "Clerk authentication configured" }
    : { status: "error", detail: "Clerk authentication configuration is incomplete" };

  checks.stripe = process.env.STRIPE_SECRET_KEY
    ? { status: "ok", detail: "Stripe billing configured" }
    : { status: "warning", detail: "Stripe billing is not configured" };

  const dayKey = new Date().toISOString().slice(0, 10);
  const configured = Number(process.env.YOUTUBE_DAILY_QUOTA_BUDGET ?? 3000);
  const budget = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 3000;
  let ledger: { units: number; blockedUntil: Date | null } | null = null;
  try {
    ledger = await db.youTubeQuotaLedger.findUnique({ where: { dayKey } });
  } catch {
    checks.youtubeQuota = { status: "warning", detail: "Quota ledger unavailable; run Prisma migrations" };
  }
  const used = ledger?.units ?? 0;
  const remaining = Math.max(0, budget - used);

  if (ledger) {
    checks.youtubeQuota = ledger.blockedUntil && ledger.blockedUntil > new Date()
      ? { status: "error", detail: `YouTube writes blocked until ${ledger.blockedUntil.toISOString()}` }
      : remaining <= Math.floor(budget * 0.1)
        ? { status: "warning", detail: `${remaining} quota safety units remaining today` }
        : { status: "ok", detail: `${remaining} quota safety units remaining today` };
  }

  const stationHealth = await db.station.findMany({ where: { tournamentId }, select: { label: true, status: true, youtubeLiveStatus: true, lastHeartbeatAt: true } });
  const staleStarting = stationHealth.filter((s) => s.youtubeLiveStatus === "starting" && s.lastHeartbeatAt && Date.now() - s.lastHeartbeatAt.getTime() > 90_000);
  const brokenLocalState = stationHealth.filter((s) => s.status === "ERROR");
  checks.stations = staleStarting.length || brokenLocalState.length
    ? { status: "warning", detail: `${staleStarting.length} station session(s) need verification; ${brokenLocalState.length} station(s) are in ERROR` }
    : { status: "ok", detail: `${stationHealth.length} station(s) have consistent local state` };

  const overall = Object.values(checks).some((check) => check.status === "error")
    ? "error"
    : Object.values(checks).some((check) => check.status === "warning")
      ? "warning"
      : "ok";

  return NextResponse.json({
    overall,
    checkedAt: new Date().toISOString(),
    checks,
    youtubeQuota: { dayKey, budget, used, remaining, blockedUntil: ledger?.blockedUntil?.toISOString() ?? null },
  });
}
