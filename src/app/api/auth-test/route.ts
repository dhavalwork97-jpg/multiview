import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, isAuthenticated } = await auth();

  return NextResponse.json({
    isAuthenticated,
    userId,
  });
}
