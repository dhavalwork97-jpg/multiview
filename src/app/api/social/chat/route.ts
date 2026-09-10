import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";
import { clientIp, defaultRateLimit } from "@/lib/rate-limit";
import { extractEmotes, isModerator, sanitizeChatMessage } from "@/lib/chat";

const headers = { "Cache-Control": "no-store" };
const postSchema = z.object({
  matchId: z.string().min(1).max(64),
  body: z.unknown(),
  parentId: z.string().min(1).max(64).nullable().optional(),
});
const reportSchema = z.object({ action: z.literal("report"), messageId: z.string().min(1).max(64), reason: z.string().trim().min(3).max(240) });
const moderateSchema = z.object({ action: z.enum(["hide", "delete", "mute"]), messageId: z.string().min(1).max(64), durationMinutes: z.number().int().min(1).max(1440).optional() });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const matchId = url.searchParams.get("matchId")?.trim();
  if (!matchId || matchId.length > 64) return NextResponse.json({ error: "Invalid match" }, { status: 400, headers });

  const viewer = await getCurrentUser();
  const rows = await db.$queryRaw<Array<{
    id: string; matchId: string; parentId: string | null; body: string; status: string; createdAt: Date;
    userId: string; username: string; displayName: string | null; avatarUrl: string | null;
  }>>`
    SELECT cm.id, cm.match_id AS "matchId", cm.parent_id AS "parentId", cm.body, cm.status,
           cm.created_at AS "createdAt", u.id AS "userId", u.username,
           u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
    FROM chat_messages cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.match_id = ${matchId} AND cm.status = 'ACTIVE'
    ORDER BY cm.created_at DESC
    LIMIT 100
  `;

  return NextResponse.json({
    messages: rows.reverse(),
    viewer: viewer ? { id: viewer.id, role: viewer.role } : null,
  }, { headers });
}

export async function POST(request: Request) {
  const limited = await defaultRateLimit.limit(`chat:${clientIp(request)}`);
  if (!limited.success) return NextResponse.json({ error: "Too many chat actions" }, { status: 429, headers });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to chat" }, { status: 401, headers });

  const input = await request.json().catch(() => null);
  if (input?.action === "report") return reportMessage(user.id, input);
  if (input?.action === "hide" || input?.action === "delete" || input?.action === "mute") return moderateMessage(user, input);

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400, headers });
  const body = sanitizeChatMessage(parsed.data.body);
  if (!body) return NextResponse.json({ error: "Message must be 1–500 characters" }, { status: 400, headers });

  const match = await db.match.findUnique({ where: { id: parsed.data.matchId }, select: { id: true } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404, headers });

  const parentId = parsed.data.parentId ?? null;
  if (parentId) {
    const parent = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM chat_messages WHERE id = ${parentId} AND match_id = ${match.id} AND status = 'ACTIVE' LIMIT 1
    `;
    if (!parent.length) return NextResponse.json({ error: "Reply target not found" }, { status: 400, headers });
  }

  const muted = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM chat_mutes WHERE match_id = ${match.id} AND user_id = ${user.id} AND expires_at > CURRENT_TIMESTAMP LIMIT 1
  `;
  if (muted.length) return NextResponse.json({ error: "You are temporarily muted in this chat" }, { status: 403, headers });

  const id = randomUUID();
  const createdAt = new Date();
  await db.$executeRaw`
    INSERT INTO chat_messages (id, match_id, user_id, parent_id, body, status, created_at, updated_at)
    VALUES (${id}, ${match.id}, ${user.id}, ${parentId}, ${body}, 'ACTIVE', ${createdAt}, ${createdAt})
  `;

  const message = {
    id, matchId: match.id, parentId, body, status: "ACTIVE", createdAt: createdAt.toISOString(),
    user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
    emotes: extractEmotes(body),
  };
  await publishEvent({ type: "chat:message", matchId: match.id, message });
  return NextResponse.json({ message }, { status: 201, headers });
}

async function reportMessage(userId: string, input: unknown) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400, headers });
  const message = await db.$queryRaw<Array<{ id: string; matchId: string }>>`
    SELECT id, match_id AS "matchId" FROM chat_messages WHERE id = ${parsed.data.messageId} LIMIT 1
  `;
  if (!message.length) return NextResponse.json({ error: "Message not found" }, { status: 404, headers });
  try {
    await db.$executeRaw`
      INSERT INTO chat_reports (id, message_id, reporter_id, reason) VALUES (${randomUUID()}, ${parsed.data.messageId}, ${userId}, ${parsed.data.reason})
    `;
  } catch {
    return NextResponse.json({ error: "You already reported this message" }, { status: 409, headers });
  }
  return NextResponse.json({ reported: true }, { headers });
}

async function moderateMessage(user: { id: string; role: string }, input: unknown) {
  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid moderation action" }, { status: 400, headers });
  const rows = await db.$queryRaw<Array<{ id: string; matchId: string; userId: string }>>`
    SELECT id, match_id AS "matchId", user_id AS "userId" FROM chat_messages WHERE id = ${parsed.data.messageId} LIMIT 1
  `;
  const message = rows[0];
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404, headers });

  const moderator = isModerator(user.role);
  const authorDelete = parsed.data.action === "delete" && message.userId === user.id;
  if (!moderator && !authorDelete) return NextResponse.json({ error: "Moderation not allowed" }, { status: 403, headers });

  if (parsed.data.action === "mute") {
    const minutes = parsed.data.durationMinutes ?? 10;
    await db.$executeRaw`
      INSERT INTO chat_mutes (id, match_id, user_id, muted_by_id, expires_at)
      VALUES (${randomUUID()}, ${message.matchId}, ${message.userId}, ${user.id}, CURRENT_TIMESTAMP + (${minutes} * INTERVAL '1 minute'))
    `;
  } else {
    const status = parsed.data.action === "hide" ? "HIDDEN" : "DELETED";
    await db.$executeRaw`UPDATE chat_messages SET status = ${status}, updated_at = CURRENT_TIMESTAMP WHERE id = ${message.id}`;
  }

  await publishEvent({ type: "chat:moderated", matchId: message.matchId, messageId: message.id, action: parsed.data.action });
  return NextResponse.json({ ok: true }, { headers });
}
