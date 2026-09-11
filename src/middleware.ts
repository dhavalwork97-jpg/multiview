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
  "/broadcast/:tournamentId/overlay(.*)",
  "/demo(.*)",
  "/api/matches",
  "/api/broadcast/public-state",
  "/api/webhooks/clerk(.*)",
  "/api/health",
  "/api/ready",
]);

// OBS browser sources must be able to render the broadcast overlay without a
// Clerk session. Keep this explicit pathname guard in addition to the matcher
// above so a matcher-parser change can never turn a live overlay into a login
// page inside OBS.
function isPublicObsOverlayPath(pathname: string) {
  return /^\/broadcast\/[^/]+\/overlay(?:\/.*)?$/.test(pathname);
}

// Temporary product-video mode. Set FGC_PUBLIC_DEMO_ENABLED=false to disable.
const demoEnabled = process.env.FGC_PUBLIC_DEMO_ENABLED !== "false";
const demoCookie = "fgc-demo";

function setDemoCookie(response: NextResponse) {
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

  // /demo is the launcher itself. /demo/** mirrors the real application routes while
  // keeping the public URL in the demo namespace.
  if (demoPath) {
    if (pathname === "/demo") return setDemoCookie(NextResponse.next());

    const targetPath = pathname.slice("/demo".length) || "/";
    const target = new URL(targetPath, req.url);
    target.search = req.nextUrl.search;
    return setDemoCookie(NextResponse.rewrite(target));
  }

  // OBS browser-source pages are machine-facing broadcast output, not operator UI.
  // They must never invoke Clerk, even when the dynamic route matcher is unable to
  // recognize the parameterized path for any reason.
  const publicObsOverlay = isPublicObsOverlayPath(pathname);
  if (!isPublicRoute(req) && !demoRequested && !publicObsOverlay) await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next).*)", "/(api|trpc)(.*)", "/__clerk/(.*)"],
};
