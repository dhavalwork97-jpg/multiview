import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redisPub } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const checks: { database: "ok" | "error"; redis: "ok" | "unavailable" | "error" } = {
    database: "error",
    redis: redisPub ? "unavailable" : "unavailable",
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    return NextResponse.json(
      { status: "error", checks, timestamp: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (redisPub) {
    try {
      if (redisPub.status === "wait") await redisPub.connect();
      await redisPub.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }
  }

  const healthy = checks.database === "ok" && checks.redis !== "error";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
