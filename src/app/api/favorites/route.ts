import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({ playerId: z.string() });

// Minimal by design — this exists because /api/recommendations needs
// real favorites to have any signal. Notification delivery ("notify me
// when they go live") is a real feature gap this doesn't fill; it needs
// a push/email delivery mechanism that doesn't exist yet, flagged here
// rather than silently left implied by the model name.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const favorite = await db.favorite.upsert({
    where: { userId_playerId: { userId: user.id, playerId: parsed.data.playerId } },
    create: { userId: user.id, playerId: parsed.data.playerId },
    update: {},
  });

  return NextResponse.json({ favorite }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.favorite.deleteMany({ where: { userId: user.id, playerId: parsed.data.playerId } });
  return NextResponse.json({ ok: true });
}
