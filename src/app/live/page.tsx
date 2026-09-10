import Link from "next/link";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

const experience = [
  ["01", "LIVE SIGNAL", "Every station. One arena.", "Move between active matches without losing the competition context."],
  ["02", "COMMUNITY", "Stay in the moment.", "Realtime chat, reactions and watch-party presence around the broadcast."],
  ["03", "COMPETITION", "Follow the bracket.", "Scores, standings and tournament state stay connected to the live feed."],
];

export default function LivePage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="fgc-shimmer relative isolate overflow-hidden rounded-shell border border-[rgba(137,112,255,.28)] bg-[linear-gradient(145deg,#0d1530,#060b1b)] shadow-[0_35px_120px_rgba(0,0,0,.52)]">
          <div className="pointer-events-none absolute -left-24 -top-28 h-96 w-96 rounded-full bg-[#6f3cff]/20 blur-[120px]" />
          <div className="pointer-events-none absolute -right-24 top-12 h-80 w-80 rounded-full bg-[#20d9ff]/10 blur-[110px]" />
          <div className="relative grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="flex min-h-[480px] flex-col justify-between border-b border-arena-700 p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <LiveBadge label="Live now" />
                  <span className="status-neutral">FGC / GLOBAL</span>
                  <span className="font-mono text-[9px] uppercase tracking-[.2em] text-ink-faint">Broadcast network</span>
                </div>
                <p className="mt-12 font-mono text-[10px] font-bold uppercase tracking-[.28em] text-[#9a6cff]">02 / Live experience</p>
                <h1 className="mt-3 max-w-3xl font-display text-6xl font-extrabold uppercase leading-[.84] tracking-[-.035em] text-white sm:text-8xl lg:text-[7.2rem]">Everything<br /><span className="fgc-gradient-text">Live.</span></h1>
                <p className="mt-7 max-w-xl text-sm leading-7 text-ink-muted sm:text-base">The live layer of FGC — active matches, synchronized scores and the community around every station.</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  <Link href="/matches" className="action-primary min-h-12 px-6">Browse matches <span aria-hidden>→</span></Link>
                  <Link href="/multiview" className="action-secondary min-h-12 px-6">Open multi-view</Link>
                </div>
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-3 border-y border-arena-700 py-4">
                <div className="border-r border-arena-700 pr-3"><p className="metric-label">Signal</p><p className="mt-1 font-display text-2xl uppercase text-[#20d9ff]">ON AIR</p></div>
                <div className="border-r border-arena-700 px-3"><p className="metric-label">Mode</p><p className="mt-1 font-display text-2xl uppercase">REALTIME</p></div>
                <div className="pl-3"><p className="metric-label">Experience</p><p className="mt-1 font-display text-2xl uppercase">MULTI-VIEW</p></div>
              </div>
            </div>
            <aside className="relative hidden min-h-[480px] overflow-hidden lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(111,60,255,.22),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(32,217,255,.08),transparent_32%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute h-[25rem] w-[25rem] rounded-full border border-[#6f3cff]/20" />
                <div className="absolute h-[18rem] w-[18rem] rounded-full border border-[#20d9ff]/15" />
                <div className="absolute h-[12rem] w-[12rem] rounded-full border border-[#ff3ca8]/15" />
                <div className="relative flex h-52 w-52 flex-col items-center justify-center rounded-full border border-[#9a6cff]/40 bg-[#070c1d]/90 shadow-[0_0_80px_rgba(111,60,255,.22),inset_0_0_60px_rgba(111,60,255,.12)] backdrop-blur-xl">
                  <span className="font-mono text-[8px] uppercase tracking-[.25em] text-ink-faint">Network state</span>
                  <span className="mt-3 font-display text-5xl uppercase text-[#20d9ff]">ON AIR</span>
                  <span className="mt-3 h-px w-16 bg-gradient-to-r from-[#ff3ca8] via-[#9a6cff] to-[#20d9ff]" />
                  <span className="mt-3 font-mono text-[8px] uppercase tracking-[.18em] text-ink-faint">Active stations</span>
                </div>
              </div>
              <div className="absolute inset-x-7 bottom-7 grid grid-cols-2 gap-2">
                <div className="surface-quiet p-4"><p className="metric-label">Broadcast</p><p className="mt-2 font-display text-lg uppercase">Realtime feed</p></div>
                <div className="surface-quiet p-4"><p className="metric-label">Community</p><p className="mt-2 font-display text-lg uppercase">Connected</p></div>
              </div>
            </aside>
          </div>
        </section>

        <section className="ds-section">
          <SectionHeader eyebrow="03 / Active stations" title="Watch what is happening now" description="Realtime match state is synchronized through the existing live feed." href="/matches" actionLabel="View all matches" />
          <div className="mt-5"><LiveGrid /></div>
        </section>

        <section className="pb-10">
          <div className="mb-5 flex items-end justify-between border-b border-arena-700/80 pb-4"><div><p className="page-kicker">04 / FGC experience</p><h2 className="section-heading mt-1">Built around the moment</h2></div></div>
          <div className="grid gap-3 md:grid-cols-3">
            {experience.map(([index, eyebrow, title, copy]) => (
              <Link href="/multiview" key={index} className="surface-card surface-card-interactive group relative overflow-hidden p-6 sm:p-7">
                <span className="absolute right-5 top-5 font-mono text-[9px] text-ink-faint">{index}</span>
                <span className="section-label">{eyebrow}</span>
                <h3 className="mt-4 font-display text-3xl uppercase tracking-wide group-hover:text-[#9a6cff]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{copy}</p>
                <span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-[#20d9ff]">Explore →</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
