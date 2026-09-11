import Link from "next/link";
import { DemoShell, Stat } from "./_components/demo-shell";

const sections = [
  ["Operations", [["/demo/admin", "Admin Control Center", "Platform administration and competition operations."], ["/demo/organizer", "Organizer Workspace", "Registrations, scheduling and moderation."], ["/demo/tournaments", "Tournament Registry", "Live competition catalogue and tournament workspace."], ["/demo/tournament", "Tournament Workspace", "Participants, matches, stages and analytics."]]],
  ["Production", [["/demo/control-room", "Broadcast Control Room", "Rundown, graphics, OBS and stream operations."], ["/demo/multiview", "MultiView", "Multi-camera monitoring and program output."], ["/demo/overlay", "Broadcast Overlay", "Viewer-facing live graphics."], ["/demo/live", "Live Experience", "Public live competition experience."]]],
  ["Competition", [["/demo/teams", "Teams", "Rosters and competition management."], ["/demo/players", "Players", "Profiles, rankings and history."], ["/demo/brackets", "Brackets", "Stages and match progression."], ["/demo/matches", "Matches", "Live and completed matches."], ["/demo/check-in", "Check-in", "Participant operations."], ["/demo/stations", "Stations", "Station assignment and operations."]]],
  ["Public Experience", [["/demo/analytics", "Analytics", "Competition and broadcast metrics."], ["/demo/showcase", "Championship Showcase", "Viewer-facing championship experience."], ["/demo/settings", "Settings", "Platform and tournament configuration."]]],
] as const;

export default function DemoHome() {
  return <DemoShell title="The complete FGC platform" eyebrow="FGC Product Demo · Public Preview">
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Live tournaments" value="07" detail="Production-ready"/><Stat label="Players" value="128" detail="Registered"/><Stat label="Concurrent viewers" value="12.4K" detail="Live broadcast"/><Stat label="Stream health" value="99.9%" detail="All systems normal"/></div>
    <div className="mt-10 space-y-10">{sections.map(([section, links]) => <section key={section}><p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-ink-faint">{section}</p><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{links.map(([href, title, desc]) => <Link key={href} href={href} className="group rounded-card border border-arena-700 bg-arena-900 p-5 transition hover:border-signal-live hover:bg-arena-800"><p className="font-display text-xl uppercase group-hover:text-signal-live">{title}</p><p className="mt-2 text-sm text-ink-muted">{desc}</p><p className="mt-5 font-mono text-xs uppercase text-signal-live">Open demo →</p></Link>)}</div></section>)}</div>
  </DemoShell>;
}
