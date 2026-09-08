import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return new NextResponse(
    [
      "Contact: https://github.com/dhavalwork97-jpg/multiview/security/advisories/new",
      "Policy: https://github.com/dhavalwork97-jpg/multiview/blob/main/SECURITY.md",
      "Canonical: https://fgc-stream-web.onrender.com/.well-known/security.txt",
    ].join("\n") + "\n",
    { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
}
