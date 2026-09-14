"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ClerkProvider = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.ClerkProvider),
  { ssr: false },
);

const PUBLIC_PREFIXES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/pricing",
  "/community",
  "/community-guidelines",
  "/terms",
  "/privacy",
  "/copyright",
  "/refunds",
  "/tournaments",
  "/teams",
  "/players",
  "/live",
  "/matches",
  "/watch",
  "/multiview",
  "/overlay",
  "/broadcast/",
  "/demo",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`)));
}

export function ConditionalClerkProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey === "pk_test_dummy" || isPublicPath(pathname)) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
