import Link from "next/link";

const nav = [
  ["Overview", "/demo"],
  ["Admin", "/demo/admin"],
  ["Organizer", "/demo/organizer"],
  ["Tournaments", "/demo/tournaments"],
  ["Tournament", "/demo/tournament"],
  ["Control Room", "/demo/control-room"],
  ["MultiView", "/demo/multiview"],
  ["Overlay", "/demo/overlay"],
  ["Teams", "/demo/teams"],
  ["Players", "/demo/players"],
  ["Brackets", "/demo/brackets"],
  ["Matches", "/demo/matches"],
  ["Check-in", "/demo/check-in"],
  ["Stations", "/demo/stations"],
  ["Analytics", "/demo/analytics"],
  ["Showcase", "/demo/showcase"],
  ["Settings", "/demo/settings"],
] as const;

export function DemoShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-arena-950 text-ink">
    <header className="sticky top-0 z-20 border-b border-arena-800 bg-arena-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 overflow-x-auto px-6 py-4">
        <Link href="/demo" className="shrink-0 font-display text-xl uppercase tracking-wide">FGC</Link>
        <nav className="flex gap-2 text-xs uppercase tracking-wider text-ink-muted">{nav.map(([label, href]) => <Link key={href} href={href} className="shrink-0 rounded-full border border-arena-800 px-3 py-1.5 hover:border-signal-live hover:text-signal-live">{label}</Link>)}</nav>
      </div>
    </header>
    <div className="mx-auto max-w-[1600px] px-6 py-10">
      {eyebrow && <p className="font-mono text-xs uppercase tracking-[0.28em] text-signal-live">{eyebrow}</p>}
      <h1 className="mt-2 font-display text-4xl uppercase md:text-6xl">{title}</h1>
      <div className="mt-8">{children}</div>
    </div>
  </main>;
}

export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-card border border-arena-800 bg-arena-900 p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p><p className="mt-2 font-display text-3xl">{value}</p>{detail && <p className="mt-1 text-sm text-ink-muted">{detail}</p>}</div>;
}
