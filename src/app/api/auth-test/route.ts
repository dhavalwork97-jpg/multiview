import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        clerkUserId: null,
        localUser: false,
        database: false,
      });
    }

    const clerkUser = await currentUser();

    const localUser = await db.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({
      authenticated: true,
      clerkUserId: userId,
      currentUserAvailable: Boolean(clerkUser),
      emailAvailable: Boolean(
        clerkUser?.emailAddresses?.length
      ),
      localUserFound: Boolean(localUser),
      localUser: localUser
        ? {
            id: localUser.id,
            clerkIdMatches: localUser.clerkId === userId,
            role: localUser.role,
          }
        : null,
      database: true,
    });
  } catch (error) {
    console.error("AUTH_DB_TEST_ERROR", error);

    return NextResponse.json(
      {
        authenticated: false,
        database: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown database/auth error",
      },
      { status: 500 },
    );
  }
}
