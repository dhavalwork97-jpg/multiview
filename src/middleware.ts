import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/community(.*)",
  "/community-guidelines(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/copyright(.*)",
  "/refunds(.*)",
  "/tournaments(.*)",
  "/teams(.*)",
  "/players(.*)",
  "/live(.*)",
  "/matches(.*)",
  "/watch(.*)",
  "/multiview(.*)",
  "/overlay(.*)",
  "/demo(.*)",
  "/api/matches",
  "/api/webhooks/clerk(.*)",
  "/api/health",
  "/api/ready",
]);

const demoEnabled = process.env.FGC_PUBLIC_DEMO_ENABLED === "true";
const demoCookie = "fgc-demo";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const demoRequested = demoEnabled && req.cookies.get(demoCookie)?.value === "1";

  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  const watchMatch = pathname.match(/^\/watch\/([^/]+)\/?$/);
  if (watchMatch && !/^c[a-z0-9]{24}$/.test(watchMatch[1])) {
    return new NextResponse(null, { status: 404 });
  }

  if (demoRequested && pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return new NextResponse("Demo mode is read-only", { status: 403 });
  }

  if (!isPublicRoute(req) && !demoRequested) {
    await auth.protect();
  }

  if (demoEnabled && pathname.startsWith("/demo")) {
    const response = NextResponse.next();
    response.cookies.set(demoCookie, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
