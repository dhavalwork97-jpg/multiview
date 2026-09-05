"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  showDashboard?: boolean;
  showAdmin?: boolean;
};

type NavItem = { href: string; label: string; short?: string; live?: boolean };

const PUBLIC_LINKS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live", live: true },
  { href: "/matches", label: "Matches" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/community", label: "Community" },
];

const SECONDARY_LINKS: NavItem[] = [
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/multiview", label: "Multi-View", short: "MultiView" },
];

export function NavLinks({ showDashboard = false, showAdmin = false }: Props) {
  const pathname = usePathname();
  const links: NavItem[] = [
    ...(showDashboard ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...PUBLIC_LINKS,
    ...SECONDARY_LINKS,
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
            aria-current={isActive ? "page" : undefined}
            className={`group relative inline-flex min-h-11 items-center whitespace-nowrap rounded-card border px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-200 sm:text-[11px] ${
              isActive
                ? "border-signal-live/50 bg-arena-800 text-ink shadow-[inset_0_-2px_0_0_rgba(255,255,255,.04)]"
                : "border-transparent text-ink-muted hover:border-arena-600 hover:bg-arena-800/80 hover:text-ink"
            }`}
          >
            {link.live && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" aria-hidden="true" />}
            {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-signal-live" aria-hidden="true" />}
            <span>{link.short ?? link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
