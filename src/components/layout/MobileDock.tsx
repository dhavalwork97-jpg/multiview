"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/live", label: "Live", icon: "●", live: true },
  { href: "/matches", label: "Matches", icon: "◈" },
  { href: "/tournaments", label: "Tournaments", icon: "◇" },
  { href: "/community", label: "Community", icon: "◎" },
];

type Props = { canManage?: boolean };

export function MobileDock({ canManage = false }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-arena-700/90 bg-arena-950/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_40px_rgba(0,0,0,.32)] backdrop-blur-xl sm:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center rounded-card px-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60 ${active ? "bg-arena-800 text-ink" : "text-ink-faint hover:bg-arena-900 hover:text-ink"}`}>
              <span className={`font-mono text-sm leading-none ${item.live ? "text-signal-live" : ""}`} aria-hidden="true">{item.icon}</span>
              <span className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em]">{item.label}</span>
              {active && <span className="mt-1 h-0.5 w-5 rounded-full bg-signal-live" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
      {canManage && (
        <Link href="/admin/tournaments/new" aria-label="Create tournament" className="absolute -top-12 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-signal-live/50 bg-signal-live text-xl font-semibold text-arena-950 shadow-[0_8px_28px_rgba(58,222,124,.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60">
          +
        </Link>
      )}
    </nav>
  );
}
