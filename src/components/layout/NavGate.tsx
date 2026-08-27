"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/overlay/")) {
    return null;
  }

  return <>{children}</>;
}