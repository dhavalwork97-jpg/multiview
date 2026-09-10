import Link from "next/link";

const sections = [
  { href: "/demo/admin", title: "Platform Admin", description: "Full FGC admin command center, tournaments, users, teams, players and platform tools." },
  { href: "/demo/organizer", title: "Organizer Command Center", description: "Organizer-facing tournament operations, readiness, incidents and event controls." },
  { href: "/demo/broadcast", title: "Broadcast Control Room", description: "Broadcast tooling and live production controls." },
  { href: "/demo/showcase", title: "FGC Showcase", description: "The product showcase/demo data experience." },
  { href: "/demo/tournaments", title: "Public Tournaments", description: "Public tournament discovery and tournament pages." },
  { href: "/demo/teams", title: "Teams", description: "Team discovery and team detail experiences." },
  { href: "/demo/players", title: "Players", description: "Player discovery and player detail experiences." },
  { href: "/demo/multiview", title: "Multiview", description: "The multi-match viewing experience." },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#08090b] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            FGC product demo
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Explore the full FGC experience.</h1>
          <p className="mt-5 text-base leading-7 text-white/60 sm:text-lg">
            Temporary public capture mode for product demos and video production. These links reuse the real FGC application surfaces; no production Clerk login is required while public demo mode is enabled.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="mb-10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-white/40">Demo route</span>
                <span className="text-white/40 transition group-hover:translate-x-1 group-hover:text-white">→</span>
              </div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">{section.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5 text-sm leading-6 text-white/60">
          <strong className="text-white">Temporary demo mode:</strong> enable <code className="rounded bg-black/30 px-1.5 py-0.5 text-amber-200">FGC_PUBLIC_DEMO_ENABLED=true</code> only on the deployment used for capture, then remove/disable it after the video is finished.
        </div>
      </div>
    </main>
  );
}
