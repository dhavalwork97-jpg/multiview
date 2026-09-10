import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "ORGANIZER") redirect("/organizer");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const tournaments = await db.tournament.findMany({
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: { id: true, name: true, slug: true, sport: true, game: true, status: true, startDate: true, participantMode: true },
  });
  const [users, teams, players] = await Promise.all([
    db.user.count(),
    db.team.count(),
    db.player.count(),
  ]);

  const tools = [
    ["/showcase", "Championship showcase", "Open the full viewer-facing Championship Weekend experience."],
    ["/admin/broadcast", "Broadcast center", "Launch OBS/browser-source overlays and live tournament views for any competition."],
    ["/admin/tournaments/new", "Create tournament", "Start a new competition with sport, participant and scoring rules."],
    ["/tournaments", "Tournament registry", "Browse every public competition."],
    ["/teams", "Teams", "Manage and inspect team rosters."],
    ["/players", "Players", "Browse individual competitors."],
    ["/organization/settings", "Organization", "Branding, members and organization controls."],
    ["/admin/users", "Users", "Platform user and role management."],
  ];

  return <main className="min-h-screen bg-arena-950 px-6 py-8"><div className="mx-auto max-w-7xl">
    <header className="mb-8 rounded-card border border-arena-700 bg-arena-900 p-5"><p className="font-mono text-xs uppercase tracking-widest text-signal-live">Admin workspace</p><h1 className="mt-1 font-display text-4xl uppercase">Competition control center</h1><p className="mt-2 max-w-3xl text-sm text-ink-muted">Create, operate, score, monitor, broadcast and publish competitions from one place. Viewer showcase and broadcast tools are available without changing the organizer dashboard.</p></header>
    <section className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-4"><Stat label="Tournaments" value={tournaments.length}/><Stat label="Teams" value={teams}/><Stat label="Players" value={players}/><Stat label="Users" value={users}/></section>
    <section className="mb-10"><h2 className="mb-3 font-display text-xl uppercase text-ink-muted">Admin tools</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tools.map(([href,label,desc])=><Link key={href} href={href} className="rounded-card border border-arena-700 bg-arena-900 p-4 hover:border-signal-live hover:bg-arena-800"><p className="font-display text-lg uppercase">{label}</p><p className="mt-1 text-sm text-ink-faint">{desc}</p></Link>)}</div></section>
    <section><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-display text-xl uppercase text-ink-muted">Recent competitions</h2><p className="text-xs text-ink-faint">Open a tournament to access scoring, standings, operations, analytics, MultiView and broadcast tools.</p></div><Link href="/tournaments" className="action-secondary">All tournaments</Link></div><div className="overflow-x-auto rounded-card border border-arena-700"><table className="min-w-full text-sm"><thead className="bg-arena-900"><tr className="text-left font-mono text-[10px] uppercase text-ink-faint"><th className="px-4 py-3">Competition</th><th className="px-4 py-3">Sport</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead><tbody>{tournaments.map(t=><tr key={t.id} className="border-t border-arena-700"><td className="px-4 py-3"><p className="font-semibold">{t.name}</p><p className="text-xs text-ink-faint">{t.game}</p></td><td className="px-4 py-3">{t.sport}</td><td className="px-4 py-3">{t.participantMode}</td><td className="px-4 py-3">{t.status}</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Link href={`/admin/tournaments/${t.id}`} className="action-secondary">Open</Link><Link href={`/overlay/${t.id}`} target="_blank" className="action-secondary">Overlay</Link></div></td></tr>)}</tbody></table></div></section>
  </div></main>
}
function Stat({label,value}:{label:string;value:number}){return <div className="rounded-card border border-arena-700 bg-arena-900 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>}
