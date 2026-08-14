import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
const schema = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80), logoUrl: z.string().url().optional().nullable(), country: z.string().max(3).optional().nullable() });
export async function GET(req: Request) { const q = new URL(req.url).searchParams.get("q")?.trim(); const teams = await db.team.findMany({ where: q ? { name: { contains: q, mode: "insensitive" } } : undefined, orderBy: { name: "asc" }, take: 50 }); return NextResponse.json({ teams }); }
export async function POST(req: Request) { try { await requireUser(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } const p=schema.safeParse(await req.json().catch(()=>null)); if(!p.success)return NextResponse.json({error:p.error.flatten()},{status:400}); return NextResponse.json({team:await db.team.create({data:p.data})},{status:201}); }
