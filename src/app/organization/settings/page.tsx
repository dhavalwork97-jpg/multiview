import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreatePersonalOrganization, getPrimaryOrganizationMembership } from "@/lib/organization";
import { BrandingForm } from "@/components/organization/BrandingForm";
export default async function OrganizationSettings(){const user=await getCurrentUser();if(!user)redirect('/sign-in');await getOrCreatePersonalOrganization(user.id);const m=await getPrimaryOrganizationMembership(user.id);if(user.role!=="ADMIN"&&(!m||!['OWNER','ADMIN'].includes(m.role)))redirect('/dashboard');return <main className="min-h-screen bg-arena-950 px-6 py-8"><div className="mx-auto max-w-4xl"><Link href="/dashboard" className="font-mono text-xs text-ink-faint">← Dashboard</Link><h1 className="mt-4 font-display text-3xl uppercase">Organization</h1><p className="mt-1 text-sm text-ink-faint">Branding, white-label settings and event identity.</p><div className="mt-8"><BrandingForm/></div></div></main>}
