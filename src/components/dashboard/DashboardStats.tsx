import Link from "next/link";

export function DashboardStats({
  tournaments,
  liveCount,
  canCreateTournament,
}: {
  tournaments: number;
  liveCount: number;
  canCreateTournament: boolean;
}) {
  const stats = [
    { label: "Your events", value: tournaments, href: "/tournaments", hint: "managed or owned" },
    { label: "Live now", value: liveCount, href: "/multiview", hint: "broadcasting" },
  ];

  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href} className="group rounded-card border border-arena-700 bg-arena-900 p-4 transition-all hover:-translate-y-0.5 hover:border-signal-live/60 hover:bg-arena-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">{stat.label}</p>
              <p className="mt-2 font-display text-4xl leading-none tracking-wide">{stat.value}</p>
              <p className="mt-2 text-xs text-ink-faint">{stat.hint}</p>
            </div>
            <span className="font-mono text-xs text-ink-faint transition-colors group-hover:text-signal-live">→</span>
          </div>
        </Link>
      ))}
      {canCreateTournament && (
        <Link href="/admin/tournaments/new" className="group rounded-card border border-signal-live/40 bg-signal-live/5 p-4 transition-all hover:-translate-y-0.5 hover:bg-signal-live/10">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-live">Quick action</p>
          <p className="mt-2 font-display text-2xl uppercase tracking-wide">Create event</p>
          <p className="mt-2 text-xs text-ink-muted">Start a new competition workspace →</p>
        </Link>
      )}
    </section>
  );
}
