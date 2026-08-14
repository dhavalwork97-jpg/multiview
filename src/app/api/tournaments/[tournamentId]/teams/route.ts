import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
const schema=z.object({teamId:z.string(),seed:z.number().int().positive().optional()});
export async function GET(_:Request,{params}:{params:Promise<{tournamentId:string}>}){const {tournamentId}=await params;return NextResponse.json({teams:await db.tournamentTeam.findMany({where:{tournamentId},include:{team:{include:{members:{include:{player:true}}}}},orderBy:{seed:"asc"}})});}
export async function POST(req:Request,{params}:{params:Promise<{tournamentId:string}>}){const {tournamentId}=await params;try{await requireTournamentManage(tournamentId);}catch{return NextResponse.json({error:"Forbidden"},{status:403})}const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:p.error.flatten()},{status:400});return NextResponse.json({team:await db.tournamentTeam.create({data:{tournamentId,...p.data}})},{status:201});}
