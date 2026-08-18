import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreatePersonalOrganization, requirePrimaryOrganizationRole } from "@/lib/organization";

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  tagline: z.string().trim().max(180).optional().nullable(),
  brandLogoUrl: z.string().url().max(500).optional().nullable(),
  brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  brandAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  customDomain: z.string().trim().max(255).optional().nullable(),
});

export async function GET() {
  try {
    const { user, organizationId } = await requirePrimaryOrganizationRole("VIEWER");
    const org = organizationId ? await db.organization.findUnique({ where: { id: organizationId } }) : await getOrCreatePersonalOrganization(user.id);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    return NextResponse.json({ organization: org });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 }); }
}

export async function PATCH(req: Request) {
  try {
    const { user, organizationId } = await requirePrimaryOrganizationRole("ADMIN");
    const id = organizationId ?? (await db.organization.findFirst({ where: { ownerId: user.id } }))?.id;
    if (!id) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const organization = await db.organization.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ organization });
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}
