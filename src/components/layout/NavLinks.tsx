"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/multiview", label: "Multi-View" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="flex min-w-max items-center gap-1">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-card border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? "border-arena-600 bg-arena-700 text-ink"
                : "border-transparent text-ink-muted hover:border-arena-600 hover:bg-arena-800 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
