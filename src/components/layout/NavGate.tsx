"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";

export function NavGate() {
  const pathname = usePathname();

  if (pathname.startsWith("/overlay/")) {
    return null;
  }

  return <Nav />;
}