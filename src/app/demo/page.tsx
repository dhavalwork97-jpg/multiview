import Link from "next/link";
import { DemoShell, Stat } from "./_components/demo-shell";

const sections = [
  ["Setup", [
    ["/demo/create-tournament", "Create Tournament", "Create an event, choose the game, format, participants, stages and stations."],
    ["/demo/admin", "Admin Control Center", "Platform administration and competition operations."],
    ["/demo/organizer", "Organizer Workspace", "Registrations, scheduling, moderation and event readiness."],
    ["/demo/tournament", "Tournament Workspace", "Participants, competition structure, matches and tournament operations."],
  ]],
  ["Broadcast", [
    ["/demo/broadcast", "Broadcast Destinations", "Connect the event to YouTube, Twitch or a custom RTMP endpoint."],
    ["/demo/matches", "Matches", "Match queue, live state and completed match operations."],
    ["/demo/control-room", "Tournament Control Room", "Rundown, station operations, stream control and live match coordination."],
    ["/demo/overlay", "Broadcast Overlay", "Viewer-facing live graphics and HUD presentation."],
    ["/demo/multiview", "MultiView", "Multi-source monitoring and program output for broadcast teams."],
  ]],
  ["Competition & Insights", [
    ["/demo/analytics", "Analytics", "Competition and broadcast performance views."],
  ]],
] as const;

const productRoutes = [
  ["/admin", "Admin", "Production admin workspace"], ["/dashboard", "Dashboard", "Signed-in home"], ["/organizer", "Organizer", "Organizer command center"], ["/tournaments", "Tournaments", "Tournament directory"], ["/teams", "Teams", "Team directory"], ["/players", "Players", "Player directory"], ["/matches", "Matches", "Match operations"], ["/live", "Live", "Public live experience"], ["/broadcast", "Broadcast", "Broadcast workspace"], ["/multiview", "MultiView", "Production monitoring"], ["/overlay", "Overlay", "Live graphics"], ["/showcase", "Showcase", "Public championship showcase"],
] as const;

export default function DemoHome() {
  return <DemoShell title="The complete FGC platform" eyebrow="FGC Product Demo · Public Preview">
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Live tournaments" value="07" detail="Production-ready"/><Stat label="Players" value="128" detail="Registered"/><Stat label="Concurrent viewers" value="12.4K" detail="Live broadcast"/><Stat label="Stream health" value="99.9%" detail="All systems normal"/></div>
    <div className="mt-10 space-y-10">{sections.map(([section, links]) => <section key={section}><p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-ink-faint">{section}</p><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{links.map(([href, title, desc]) => <Link key={href} href={href} className="group rounded-card border border-arena-700 bg-arena-900 p-5 transition hover:border-signal-live hover:bg-arena-800"><p className="font-display text-xl uppercase group-hover:text-signal-live">{title}</p><p className="mt-2 text-sm text-ink-muted">{desc}</p><p className="mt-5 font-mono text-xs uppercase text-signal-live">Open demo →</p></Link>)}</div></section>)}
      <section><div className="mb-3"><p className="font-mono text-xs uppercase tracking-[0.24em] text-ink-faint">Full product</p><p className="mt-1 text-sm text-ink-muted">The demo is the safe public showcase. These links expose corresponding production workspaces for authenticated review.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{productRoutes.map(([href, title, desc]) => <Link key={href} href={href} className="rounded-card border border-arena-800 bg-arena-950 p-4 transition hover:border-signal-live"><p className="font-display text-lg uppercase">{title}</p><p className="mt-1 text-xs text-ink-muted">{desc}</p><p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">Open product →</p></Link>)}</div></section>
    </div>
  </DemoShell>;
}
