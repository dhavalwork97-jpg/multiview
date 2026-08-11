import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/billing";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  if (user.trialEndsAt && user.trialEndsAt.getTime() > Date.now()) {
    return NextResponse.json({ ok: true, alreadyActive: true, trialEndsAt: user.trialEndsAt });
  }

  if (user.trialStartedAt) {
    return NextResponse.json({ error: "Free trial has already been used" }, { status: 409 });
  }

  const started = new Date();
  const ends = new Date(started.getTime() + TRIAL_DAYS * 86400000);
  await db.user.update({ where: { id: user.id }, data: { trialStartedAt: started, trialEndsAt: ends } });
  return NextResponse.json({ ok: true, trialEndsAt: ends });
}
