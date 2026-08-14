import { db } from "@/lib/db";

// YouTube Live write operations are deliberately treated as expensive. The
// app keeps a conservative daily budget so a bug, double-click, or retry loop
// cannot consume the entire Google project quota. Reads/status polling are not
// charged here because the app no longer performs them for normal viewers.
export const YOUTUBE_QUOTA_UNITS = {
  LIVE_STREAM_INSERT: 50,
  BROADCAST_INSERT: 50,
  BROADCAST_BIND: 50,
  BROADCAST_TRANSITION: 50,
  BROADCAST_DELETE: 50,
} as const;

const DEFAULT_DAILY_BUDGET = 3000;

function dailyBudget() {
  const value = Number(process.env.YOUTUBE_DAILY_QUOTA_BUDGET ?? DEFAULT_DAILY_BUDGET);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_DAILY_BUDGET;
}

function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function nextUtcDay(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

export function isYouTubeQuotaError(error: unknown) {
  return /quotaExceeded|dailyLimitExceeded/i.test(String(error));
}

export async function reserveYouTubeQuota(units: number, operation: string) {
  const now = new Date();
  const key = dayKey(now);
  const budget = dailyBudget();

  if (units > budget) {
    throw new Error(`YouTube operation ${operation} exceeds the configured daily quota safety budget (${budget} units)`);
  }

  const ledger = await db.youtubeQuotaLedger.upsert({
    where: { dayKey: key },
    create: { dayKey: key },
    update: {},
  });

  if (ledger.blockedUntil && ledger.blockedUntil > now) {
    throw new Error(`YouTube quota is temporarily blocked until ${ledger.blockedUntil.toISOString()}; no further API writes will be attempted today`);
  }

  const result = await db.youtubeQuotaLedger.updateMany({
    where: {
      dayKey: key,
      blockedUntil: null,
      units: { lte: budget - units },
    },
    data: { units: { increment: units } },
  });

  if (result.count !== 1) {
    throw new Error(`YouTube daily safety budget reached; refusing ${operation}. Configure YOUTUBE_DAILY_QUOTA_BUDGET only if you intentionally want a higher application-side limit.`);
  }

  return { dayKey: key, reservedUnits: units, budget };
}

export async function markYouTubeQuotaBlocked() {
  const now = new Date();
  await db.youtubeQuotaLedger.upsert({
    where: { dayKey: dayKey(now) },
    create: { dayKey: dayKey(now), blockedUntil: nextUtcDay(now) },
    update: { blockedUntil: nextUtcDay(now) },
  });
}
