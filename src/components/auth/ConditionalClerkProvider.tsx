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

const AUTH_PREFIXES = ["/sign-in", "/sign-up"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => prefix !== "/" && matchesPrefix(pathname, prefix));
}

function isAuthPath(pathname: string) {
  return AUTH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function ConditionalClerkProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const needsClerk = isAuthPath(pathname) || !isPublicPath(pathname);

  // Public viewer pages stay Clerk-free. Sign-in/sign-up and protected workspaces
  // get the provider so authentication works without making Clerk part of the
  // public browsing runtime.
  if (!publishableKey || publishableKey === "pk_test_dummy" || !needsClerk) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
