import { db } from "@/lib/db";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function DemoTournament() { const t = await db.tournament.findFirst({ orderBy: { updatedAt: "desc" }, select: { id: true } }); if (t) redirect(`/admin/tournaments/${t.id}`); redirect("/tournaments"); }
