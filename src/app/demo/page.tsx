import Link from "next/link";

export const dynamic = "force-dynamic";

const sections = [
  [
    "Operations",
    [
      ["/demo/admin", "Admin / Competition Control Center", "Platform administration, tournaments, teams, players and broadcast tools."],
      ["/demo/organizer", "Organizer Workspace", "Organizer operations, registrations, scheduling and moderation."],
      ["/demo/tournaments", "Tournament Registry", "Browse the competition catalogue and open a live tournament."],
      ["/demo/tournament", "Tournament Workspace", "Competition overview, participants, matches, stages and analytics."],
    ],
  ],
  [
    "Production",
    [
      ["/demo/control-room", "Broadcast Control Room", "Live production control, rundown, graphics and OBS integration."],
      ["/demo/multiview", "MultiView", "Multi-camera production monitoring and live viewing."],
      ["/demo/overlay", "Broadcast Overlay", "Public graphics layer suitable for OBS Browser Sources."],
      ["/demo/live", "Live Experience", "Viewer-facing live competition experience."],
    ],
  ],
  [
    "Competition",
    [
      ["/demo/teams", "Teams", "Team rosters and competition management."],
      ["/demo/players", "Players", "Player profiles, rankings and competition history."],
      ["/demo/brackets", "Brackets", "Tournament stages, matches and progression."],
      ["/demo/matches", "Matches", "Live and completed match listings."],
      ["/demo/check-in", "Check-in", "Participant check-in and event operations."],
      ["/demo/stations", "Stations", "Station assignment and match operations."],
    ],
  ],
  [
    "Public Experience",
    [
      ["/demo/showcase", "Championship Showcase", "Viewer-facing Championship Weekend experience."],
      ["/demo/settings", "Settings", "Tournament and platform configuration."],
    ],
  ],
] as const;

export default function DemoHome() {
  return (
    <main className="min-h-screen bg-arena-950 px-6 py-10 text-ink">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal-live">FGC Product Demo · Public Preview</p>
          <h1 className="mt-3 font-display text-5xl uppercase md:text-7xl">The complete FGC platform</h1>
          <p className="mt-5 text-lg text-ink-muted">Explore the full tournament operations and broadcast production workflow. This temporary demo namespace requires no Clerk authentication and is read-only.</p>
        </div>
        <div className="mt-10 space-y-10">
          {sections.map(([section, links]) => (
            <section key={section}>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-ink-faint">{section}</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {links.map(([href, title, desc]) => (
                  <Link key={href} href={href} className="group rounded-card border border-arena-700 bg-arena-900 p-5 transition hover:border-signal-live hover:bg-arena-800">
                    <p className="font-display text-xl uppercase group-hover:text-signal-live">{title}</p>
                    <p className="mt-2 text-sm text-ink-muted">{desc}</p>
                    <p className="mt-5 font-mono text-xs uppercase text-signal-live">Open demo →</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
