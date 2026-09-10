import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DemoHome() {
  if (process.env.FGC_PUBLIC_DEMO_ENABLED !== "true") {
    return <main className="min-h-screen bg-arena-950 p-10 text-ink">Demo mode is disabled.</main>;
  }
  const tournament = await db.tournament.findFirst({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, game: true } });
  const id = tournament?.id;
  const links = [
    ["/demo/admin", "Admin / Competition Control Center", "Platform administration, tournaments, teams, players and broadcast tools."],
    ["/demo/organizer", "Organizer Workspace", "Organizer operations, registrations, scheduling and moderation."],
    ["/demo/tournament", "Tournament Workspace", "Competition overview, standings, matches, stages and analytics."],
    ["/demo/control-room", "Broadcast Control Room", "Live production control, OBS integration and broadcast rundown."],
    ["/demo/multiview", "MultiView", "Multi-camera tournament viewing and live production experience."],
    ["/demo/overlay", "Broadcast Overlay", "Public graphics layer suitable for OBS browser sources."],
    ["/showcase", "Championship Showcase", "Viewer-facing Championship Weekend product experience."],
  ];
  return <main className="min-h-screen bg-arena-950 px-6 py-10 text-ink"><div className="mx-auto max-w-6xl"><p className="font-mono text-xs uppercase tracking-[0.3em] text-signal-live">FGC Product Demo</p><h1 className="mt-2 font-display text-5xl uppercase">Full platform walkthrough</h1><p className="mt-4 max-w-3xl text-ink-muted">Temporary public, read-only demo access for product video capture. Production authentication remains unchanged.</p>{tournament && <div className="mt-6 rounded-card border border-arena-700 bg-arena-900 p-4"><p className="text-xs uppercase text-ink-faint">Demo competition</p><p className="mt-1 font-display text-2xl uppercase">{tournament.name}</p><p className="text-sm text-ink-muted">{tournament.game} · {tournament.id}</p></div>}<div className="mt-8 grid gap-4 md:grid-cols-2">{links.map(([href,title,desc]) => <Link key={href} href={href} className="rounded-card border border-arena-700 bg-arena-900 p-5 transition hover:border-signal-live hover:bg-arena-800"><p className="font-display text-xl uppercase">{title}</p><p className="mt-2 text-sm text-ink-muted">{desc}</p><p className="mt-4 font-mono text-xs uppercase text-signal-live">Open demo →</p></Link>)}</div></div></main>;
}
