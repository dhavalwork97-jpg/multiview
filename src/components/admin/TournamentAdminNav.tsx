import Link from "next/link";

export function TournamentAdminNav({ tournamentId, slug }: { tournamentId: string; slug?: string }) {
  const base = `/admin/tournaments/${tournamentId}`;
  const primary = [
    ["", "Overview"],
    ["/competition", "Rules"],
    ["/participants", "Participants"],
    ["/matches", "Scoring"],
    ["/control-room", "Control Room"],
    ["/operations", "Operations"],
    ["/ops", "Stations"],
    ["/analytics", "Analytics"],
    ["/report", "Report"],
    ["/data", "Import / Export"],
  ] as const;
  const secondary = [
    ...(slug ? [[`/e/${slug}`, "Public Event"] as const] : []),
    ["/teams", "Global Teams"] as const,
    ["/players", "Global Players"],
    ["/multiview", "Multi-View"],
  ] as const;

  return (
    <div className="space-y-2">
      <nav aria-label="Tournament administration" className="flex gap-2 overflow-x-auto rounded-card border border-arena-700 bg-arena-900 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {primary.map(([suffix, label]) => (
          <Link key={label} href={`${base}${suffix}`} className="inline-flex min-h-10 shrink-0 items-center rounded-card border border-arena-700 bg-arena-950 px-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-muted hover:border-signal-live hover:bg-arena-800 hover:text-signal-live">
            {label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Tournament external resources" className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {secondary.map(([href, label]) => (
          <Link key={label} href={href} className="inline-flex min-h-9 shrink-0 items-center rounded-card border border-arena-700 px-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-faint hover:border-signal-live hover:text-signal-live">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
