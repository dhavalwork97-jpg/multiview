import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (_auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Keep Clerk middleware active for static/404 requests. The root layout
  // contains ClerkProvider, so missing assets must still have Clerk context.
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  const watchMatch = pathname.match(/^\/watch\/([^/]+)\/?$/);
  if (watchMatch && !/^c[a-z0-9]{24}$/.test(watchMatch[1])) {
    return new NextResponse(null, { status: 404 });
  }

  // Authentication and authorization are enforced at the resource boundary
  // (pages, route handlers, and server functions). Keeping middleware focused
  // on attaching Clerk context avoids turning protected App Router pages into
  // opaque 404s while preserving the same server-side access checks.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
