import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
export default async function BrandedEventRoute({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const t=await db.tournament.findUnique({where:{slug},select:{id:true,publicEnabled:true}});if(!t||!t.publicEnabled)notFound();redirect(`/tournaments/${t.id}`);}
