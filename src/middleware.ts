import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Everything is public by default (viewers should never hit a login wall
// just to watch a match) — we explicitly list what requires auth instead.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api/tournaments(.*)",
  "/api/stations(.*)",
  "/api/matches/(.*)/assign", // assigning a match to a station is a write op
]);

// Note: /api/brackets GET (bracket viewing) and /api/matches GET (live grid)
// are intentionally left off this list — viewers browse both signed out.
// Their POST/PATCH counterparts still enforce ORGANIZER/ADMIN via
// requireRole() inside the route handler itself.

const isOrganizerRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (authFn, req) => {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();
  const isPlatformHost = !host || host.endsWith("vercel.app") || host === "localhost" || host === "127.0.0.1";
  if (!isPlatformHost && !req.nextUrl.pathname.startsWith("/api/")) {
    try {
      const response = await fetch(new URL(`/api/public/domain?host=${encodeURIComponent(host)}`, req.url));
      const data = await response.json() as { slug?: string | null };
      if (data.slug && req.nextUrl.pathname === "/") return NextResponse.rewrite(new URL(`/e/${data.slug}`, req.url));
    } catch {}
  }
  if (isProtectedRoute(req)) {
    await authFn.protect();
  }

  if (isOrganizerRoute(req)) {
    const { sessionClaims } = await authFn();
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
    if (role !== "ORGANIZER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
