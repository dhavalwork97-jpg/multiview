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

const DEMO_ENABLED = process.env.FGC_PUBLIC_DEMO_ENABLED === "true";
const DEMO_COOKIE = "fgc-demo";
const DEMO_ROLE_COOKIE = "fgc-demo-role";

function demoRoleForPath(pathname: string) {
  if (pathname.startsWith("/demo/organizer")) return "ORGANIZER";
  return "ADMIN";
}

function demoTarget(pathname: string) {
  if (pathname === "/demo/admin" || pathname.startsWith("/demo/admin/")) return pathname.replace(/^\/demo\/admin/, "/admin");
  if (pathname === "/demo/organizer" || pathname.startsWith("/demo/organizer/")) return pathname.replace(/^\/demo\/organizer/, "/organizer");
  if (pathname === "/demo/broadcast" || pathname.startsWith("/demo/broadcast/")) return pathname.replace(/^\/demo\/broadcast/, "/admin/broadcast");
  if (pathname === "/demo/showcase" || pathname.startsWith("/demo/showcase/")) return pathname.replace(/^\/demo\/showcase/, "/admin/showcase");
  if (pathname === "/demo/tournaments" || pathname.startsWith("/demo/tournaments/")) return pathname.replace(/^\/demo\/tournaments/, "/tournaments");
  if (pathname === "/demo/teams" || pathname.startsWith("/demo/teams/")) return pathname.replace(/^\/demo\/teams/, "/teams");
  if (pathname === "/demo/players" || pathname.startsWith("/demo/players/")) return pathname.replace(/^\/demo\/players/, "/players");
  if (pathname === "/demo/multiview" || pathname.startsWith("/demo/multiview/")) return pathname.replace(/^\/demo\/multiview/, "/multiview");
  if (pathname === "/demo/overlay" || pathname.startsWith("/demo/overlay/")) return pathname.replace(/^\/demo\/overlay/, "/overlay");
  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const demoCookie = req.cookies.get(DEMO_COOKIE)?.value === "1";
  const demoRole = req.cookies.get(DEMO_ROLE_COOKIE)?.value === "ORGANIZER" ? "ORGANIZER" : "ADMIN";

  if (pathname.includes(".")) return NextResponse.next();

  const watchMatch = pathname.match(/^\/watch\/([^/]+)\/?$/);
  if (watchMatch && !/^c[a-z0-9]{24}$/.test(watchMatch[1])) {
    return new NextResponse(null, { status: 404 });
  }

  if (DEMO_ENABLED && pathname === "/demo") {
    const response = NextResponse.next();
    response.cookies.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    response.cookies.set(DEMO_ROLE_COOKIE, "ADMIN", { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    return response;
  }

  if (DEMO_ENABLED && pathname.startsWith("/demo/")) {
    const target = demoTarget(pathname);
    if (target) {
      const role = demoRoleForPath(pathname);
      const headers = new Headers(req.headers);
      headers.set("x-fgc-demo", "1");
      headers.set("x-fgc-demo-role", role);
      const url = req.nextUrl.clone();
      url.pathname = target;
      const response = NextResponse.rewrite(url, { request: { headers } });
      response.cookies.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
      response.cookies.set(DEMO_ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
      return response;
    }
  }

  if (DEMO_ENABLED && demoCookie) {
    const headers = new Headers(req.headers);
    headers.set("x-fgc-demo", "1");
    headers.set("x-fgc-demo-role", demoRole);
    return NextResponse.next({ request: { headers } });
  }

  if (!isPublicRoute(req)) await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
