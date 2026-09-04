import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/tournaments(.*)",
  "/overlay(.*)",
  "/watch(.*)",
  "/multiview(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/health",
  "/api/ready",
]);

export default clerkMiddleware(async (auth, req) => {
  const watchMatch = req.nextUrl.pathname.match(/^\/watch\/([^/]+)\/?$/);
  if (watchMatch && !/^c[a-z0-9]{24}$/.test(watchMatch[1])) {
    return new NextResponse(null, { status: 404 });
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
