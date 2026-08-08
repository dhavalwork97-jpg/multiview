"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/multiview", label: "Multi-View" },
];

// Separated from Nav (server component) so only the small bit that
// actually needs the current path to highlight the active link pays for
// client-side JS — the rest of the header (logo, auth controls) stays
// server-rendered.
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        // Home is only "active" on an exact match — otherwise every
        // route would light it up, since everything starts with "/".
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-card px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors ${
              isActive
                ? "bg-arena-700 text-ink"
                : "text-ink-faint hover:bg-arena-800 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
