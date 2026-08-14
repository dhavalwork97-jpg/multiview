import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(_: Request,{params}:{params:Promise<{teamId:string}>}){const {teamId}=await params;const team=await db.team.findUnique({where:{id:teamId},include:{members:{include:{player:true}},tournaments:{include:{tournament:{select:{id:true,name:true,slug:true,game:true,status:true}}}}}});if(!team)return NextResponse.json({error:"Not found"},{status:404});return NextResponse.json({team});}
