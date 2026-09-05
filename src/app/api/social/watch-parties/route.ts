import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, defaultRateLimit } from "@/lib/rate-limit";

const headers = { "Cache-Control": "no-store" };
const createSchema = z.object({ matchId: z.string().min(1).max(100) });
const codeSchema = z.string().regex(/^[A-Z0-9]{8}$/);

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function POST(request: Request) {
  const limited = await defaultRateLimit.limit(`watch-party:${clientIp(request)}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid matchId" }, { status: 400, headers });

  const match = await db.match.findUnique({ where: { id: parsed.data.matchId }, select: { id: true } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404, headers });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeCode();
    try {
      const party = await db.$queryRaw<Array<{ id: string; code: string; expiresAt: Date }>>`
        INSERT INTO "watch_parties" ("id", "code", "matchId", "hostId", "expiresAt")
        VALUES (${crypto.randomUUID()}, ${code}, ${match.id}, ${me.id}, ${new Date(Date.now() + 4 * 60 * 60 * 1000)})
        RETURNING "id", "code", "expiresAt"
      `;
      return NextResponse.json({ party: { ...party[0], matchId: match.id, hostId: me.id } }, { headers });
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  return NextResponse.json({ error: "Unable to create party" }, { status: 503, headers });
}

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const code = codeSchema.safeParse(new URL(request.url).searchParams.get("code") ?? "");
  if (!code.success) return NextResponse.json({ error: "Invalid invite code" }, { status: 400, headers });
  const rows = await db.$queryRaw<Array<{ id: string; code: string; matchId: string; hostId: string; expiresAt: Date }>>`
    SELECT "id", "code", "matchId", "hostId", "expiresAt"
    FROM "watch_parties"
    WHERE "code" = ${code.data} AND "expiresAt" > CURRENT_TIMESTAMP
    LIMIT 1
  `;
  if (!rows[0]) return NextResponse.json({ error: "Party not found or expired" }, { status: 404, headers });
  return NextResponse.json({ party: rows[0], isHost: rows[0].hostId === me.id }, { headers });
}
