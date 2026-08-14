import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { requirePrimaryOrganizationRole } from "@/lib/organization";

const schema = z.object({ tournamentId: z.string(), name: z.string().trim().min(1).max(100), logoUrl: z.string().url().optional().nullable(), websiteUrl: z.string().url().optional().nullable(), bannerUrl: z.string().url().optional().nullable(), placement: z.string().max(40).default("EVENT") });
export async function GET(req: Request) { const tournamentId = new URL(req.url).searchParams.get("tournamentId"); if (!tournamentId) return NextResponse.json({ error: "tournamentId required" }, { status: 400 }); const sponsors = await db.sponsor.findMany({ where: { tournamentId, active: true }, orderBy: { weight: "desc" } }); return NextResponse.json({ sponsors }); }
export async function POST(req: Request) { const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }); try { await requireTournamentManage(parsed.data.tournamentId); const { organizationId } = await requirePrimaryOrganizationRole("ADMIN"); if (!organizationId) return NextResponse.json({ error: "Organization required" }, { status: 400 }); const sponsor = await db.sponsor.create({ data: { ...parsed.data, organizationId } }); return NextResponse.json({ sponsor }, { status: 201 }); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); } }
