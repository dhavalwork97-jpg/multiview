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

// Temporary product-video mode. Set FGC_PUBLIC_DEMO_ENABLED=false to disable.
const demoEnabled = process.env.FGC_PUBLIC_DEMO_ENABLED !== "false";
const demoCookie = "fgc-demo";

function demoResponse(req: Request, pathname: string) {
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

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const demoPath = demoEnabled && (pathname === "/demo" || pathname.startsWith("/demo/"));
  const demoRequested = demoEnabled && req.cookies.get(demoCookie)?.value === "1";

  if (pathname.includes(".")) return NextResponse.next();

  const watchMatch = pathname.match(/^\/watch\/([^/]+)\/?$/);
  if (watchMatch && !/^c[a-z0-9]{24}$/.test(watchMatch[1])) return new NextResponse(null, { status: 404 });

  // Demo is intentionally read-only. Never allow a public demo visitor to mutate data.
  if ((demoPath || demoRequested) && pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return new NextResponse("Demo mode is read-only", { status: 403 });
  }

  // /demo/** is a public mirror of the real application. Strip only the /demo prefix
  // for Next.js routing while keeping the browser URL in the public demo namespace.
  if (demoPath) {
    const targetPath = pathname === "/demo" ? "/" : pathname.slice("/demo".length) || "/";
    const target = new URL(targetPath, req.url);
    target.search = req.nextUrl.search;
    const response = NextResponse.rewrite(target);
    response.cookies.set(demoCookie, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    return response;
  }

  if (!isPublicRoute(req) && !demoRequested) await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next).*)", "/(api|trpc)(.*)", "/__clerk/(.*)"],
};
