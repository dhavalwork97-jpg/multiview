import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { z } from "zod";
const schema=z.object({players:z.array(z.string().trim().min(1).max(80)).min(1).max(128)});
export async function POST(req:Request,{params}:{params:Promise<{tournamentId:string}>}){const {tournamentId}=await params;try{await requireTournamentManage(tournamentId);}catch{return NextResponse.json({error:"Forbidden"},{status:403})}const body=await req.json().catch(()=>null);const p=schema.safeParse(body);if(!p.success)return NextResponse.json({error:p.error.flatten()},{status:400});const unique=[...new Set(p.data.players.map(x=>x.trim()).filter(Boolean))];const created=[];for(const gamertag of unique){const player=await db.player.upsert({where:{gamertag},update:{},create:{gamertag}});await db.tournamentEntrant.upsert({where:{tournamentId_playerId:{tournamentId,playerId:player.id}},update:{},create:{tournamentId,playerId:player.id}});created.push(gamertag)}return NextResponse.json({imported:created.length,players:created});}
