"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  showDashboard?: boolean;
  showAdmin?: boolean;
};

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/multiview", label: "Multi-View" },
];

export function NavLinks({ showDashboard = false, showAdmin = false }: Props) {
  const pathname = usePathname();
  const links = [
    ...(showDashboard ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...PUBLIC_LINKS,
    ...(showAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav aria-label="Primary navigation" className="flex min-w-max items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-card border px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? "border-signal-live/60 bg-arena-700 text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]"
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
