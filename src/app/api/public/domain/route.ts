import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(req:Request){const host=new URL(req.url).searchParams.get("host")?.split(":")[0].toLowerCase();if(!host)return NextResponse.json({slug:null});const org=await db.organization.findUnique({where:{customDomain:host},select:{id:true}});if(!org)return NextResponse.json({slug:null});const t=await db.tournament.findFirst({where:{organizationId:org.id,publicEnabled:true,status:{in:["SCHEDULED","LIVE"]}},orderBy:{startDate:"desc"},select:{slug:true}});return NextResponse.json({slug:t?.slug??null});}
