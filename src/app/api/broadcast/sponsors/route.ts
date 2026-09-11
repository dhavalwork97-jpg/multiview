import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeBroadcastOperator } from "@/lib/broadcast/authorization";
import { db } from "@/lib/db";
import { normalizeSponsor, type BroadcastSponsor } from "@/lib/broadcast/sponsor";

function toBroadcastSponsor(sponsor: {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  active: boolean;
  weight: number;
}): BroadcastSponsor {
  return normalizeSponsor({
    id: sponsor.id,
    name: sponsor.name,
    logoUrl: sponsor.logoUrl,
    websiteUrl: sponsor.websiteUrl,
    enabled: sponsor.active,
    durationMs: sponsor.weight,
  });
}

async function authorize(request: Request) {
  const { userId } = await auth();
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const url = new URL(request.url);
  const tournamentId = url.searchParams.get("tournamentId");
  if (!tournamentId) return { response: NextResponse.json({ error: "tournamentId is required" }, { status: 400 }) };

  const authorization = await authorizeBroadcastOperator(userId, tournamentId);
  if (!authorization.ok) {
    return {
      response: NextResponse.json(
        { error: authorization.status === 404 ? "Tournament not found" : "Forbidden" },
        { status: authorization.status },
      ),
    };
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizationId: true },
  });

  if (!tournament) return { response: NextResponse.json({ error: "Tournament not found" }, { status: 404 }) };
  return { tournamentId, organizationId: tournament.organizationId };
}

export async function GET(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;

  const sponsors = await db.sponsor.findMany({
    where: { tournamentId: authz.tournamentId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, logoUrl: true, websiteUrl: true, active: true, weight: true },
  });

  return NextResponse.json({ sponsors: sponsors.map(toBroadcastSponsor) });
}

export async function POST(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;

  const body = (await request.json()) as { sponsor?: Partial<BroadcastSponsor> };
  if (!body.sponsor?.name?.trim()) {
    return NextResponse.json({ error: "sponsor.name is required" }, { status: 400 });
  }

  const sponsor = normalizeSponsor(body.sponsor);
  const created = await db.sponsor.create({
    data: {
      organizationId: authz.organizationId,
      tournamentId: authz.tournamentId,
      name: sponsor.name,
      logoUrl: sponsor.logoUrl,
      websiteUrl: sponsor.websiteUrl,
      active: sponsor.enabled,
      weight: sponsor.durationMs,
    },
    select: { id: true, name: true, logoUrl: true, websiteUrl: true, active: true, weight: true },
  });

  return NextResponse.json({ sponsor: toBroadcastSponsor(created) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;

  const body = (await request.json()) as { id?: string; sponsor?: Partial<BroadcastSponsor> };
  if (!body.id || !body.sponsor) {
    return NextResponse.json({ error: "id and sponsor are required" }, { status: 400 });
  }

  const existing = await db.sponsor.findFirst({
    where: { id: body.id, tournamentId: authz.tournamentId },
  });
  if (!existing) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const sponsor = normalizeSponsor({
    id: existing.id,
    name: body.sponsor.name ?? existing.name,
    logoUrl: body.sponsor.logoUrl ?? existing.logoUrl,
    websiteUrl: body.sponsor.websiteUrl ?? existing.websiteUrl,
    enabled: body.sponsor.enabled ?? existing.active,
    durationMs: body.sponsor.durationMs ?? existing.weight,
  });

  const updated = await db.sponsor.update({
    where: { id: existing.id },
    data: {
      name: sponsor.name,
      logoUrl: sponsor.logoUrl,
      websiteUrl: sponsor.websiteUrl,
      active: sponsor.enabled,
      weight: sponsor.durationMs,
    },
    select: { id: true, name: true, logoUrl: true, websiteUrl: true, active: true, weight: true },
  });

  return NextResponse.json({ sponsor: toBroadcastSponsor(updated) });
}

export async function DELETE(request: Request) {
  const authz = await authorize(request);
  if ("response" in authz) return authz.response;

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const deleted = await db.sponsor.deleteMany({
    where: { id: body.id, tournamentId: authz.tournamentId },
  });

  if (!deleted.count) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
