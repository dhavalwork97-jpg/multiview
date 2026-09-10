"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Tournament = { id: string; slug: string | null; name: string; status: string; startDate: string; publicEnabled: boolean; matches: number; competitors: number; stations: number; incidents: number; readiness: number };
type Props = { tournaments: Tournament[]; canCreateTournament: boolean; canManageOrganization: boolean; liveCount: number; upcomingCount: number; openIncidentCount: number };
const nav = [["Command", "#command"], ["Events", "#events"], ["Operations", "#operations"], ["Insights", "#insights"]] as const;

function statusTone(status: string) {
  const value = status.toUpperCase();
  if (value === "LIVE") return "border-cyan-300/30 bg-cyan-300/[.08] text-cyan-200";
  if (value === "COMPLETED") return "border-white/10 bg-white/[.03] text-white/35";
  return "border-fuchsia-300/25 bg-fuchsia-300/[.06] text-fuchsia-200";
}

export default function OrganizerCommandDeck({ tournaments, canCreateTournament, canManageOrganization, liveCount, upcomingCount, openIncidentCount }: Props) {
  const nextEvent = tournaments.find((t) => t.status.toUpperCase() !== "COMPLETED");
  const readiness = nextEvent?.readiness ?? 0;
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050817] text-ink">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-[32rem] w-[32rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>
      <div className="relative mx-auto max-w-[1680px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="sticky top-3 z-30 mb-7 rounded-[18px] border border-white/[.1] bg-[#070c1d]/90 shadow-[0_20px_60px_rgba(0,0,0,.4)] backdrop-blur-2xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white font-display text-xl font-extrabold italic text-black shadow-[0_0_24px_rgba(111,60,255,.22)]">F</div>
              <div className="min-w-0"><p className="truncate font-display text-lg font-bold uppercase tracking-[.06em]">FGC <span className="text-white/30">{'//'}</span> Command</p><p className="font-mono text-[8px] uppercase tracking-[.22em] text-white/35">Organizer OS · V32</p></div>
            </div>
            <nav className="hidden items-center gap-6 md:flex">{nav.map(([label, href]) => <a key={href} href={href} className="font-mono text-[9px] font-bold uppercase tracking-[.17em] text-white/40 transition hover:text-white">{label}</a>)}</nav>
            <div className="flex shrink-0 gap-2">{canCreateTournament && <Link href="/admin/tournaments/new" className="rounded-[10px] bg-white px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[.1em] text-black transition hover:-translate-y-px">+ New event</Link>}<Link href="/dashboard" className="hidden rounded-[10px] border border-white/10 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[.1em] text-white/60 transition hover:border-white/20 hover:text-white sm:block">Viewer</Link></div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-white/[.07] px-3 py-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{nav.map(([label, href]) => <a key={href} href={href} className="shrink-0 rounded-lg px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[.16em] text-white/40">{label}</a>)}</div>
        </header>

        <main id="command" className="space-y-7 sm:space-y-8">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.65fr)]">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[24px] border border-white/[.1] bg-white/[.035] p-6 shadow-[0_28px_90px_rgba(0,0,0,.35)] backdrop-blur-xl sm:rounded-[28px] sm:p-10">
              <div className="absolute right-6 top-6 font-mono text-[8px] uppercase tracking-[.28em] text-cyan-300/45 sm:right-8 sm:top-8">Live operations layer</div>
              <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[.3em] text-fuchsia-300/80">V32 / command deck</p>
              <h1 className="max-w-3xl font-display text-[3.25rem] font-extrabold uppercase leading-[.82] tracking-[.01em] sm:text-6xl lg:text-7xl">Run the event.<br /><span className="text-white/30">Own the moment.</span></h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/45">A focused operating layer for tournaments, broadcasts, stations, competitors and incidents — built to scan first and act fast.</p>
              <div className="mt-7 flex flex-wrap gap-2.5">{nextEvent && <Link href={`/admin/tournaments/${nextEvent.id}`} className="rounded-[10px] bg-white px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[.1em] text-black transition hover:-translate-y-px">Open next event</Link>}{nextEvent?.publicEnabled && <Link href={`/tournaments/${nextEvent.slug ?? nextEvent.id}`} className="rounded-[10px] border border-white/10 bg-white/[.025] px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[.1em] text-white/65 transition hover:border-cyan-300/25 hover:text-white">Preview public page</Link>}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .08 }} className="surface-console p-6 sm:p-7">
              <div className="flex items-center justify-between"><p className="metric-label">Event readiness</p><span className={`h-2 w-2 rounded-full ${readiness >= 80 ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.9)]" : readiness >= 50 ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,.7)]" : "bg-rose-300 shadow-[0_0_18px_rgba(253,164,175,.7)]"}`} /></div>
              <div className="mt-7 flex items-end gap-2"><span className="font-display text-7xl font-extrabold leading-none tracking-[-.02em]">{readiness}</span><span className="pb-1 font-mono text-xs text-white/30">%</span></div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[.08]"><motion.div initial={{ width: 0 }} animate={{ width: `${readiness}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300" /></div>
              <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[8px] uppercase tracking-[.1em] text-white/30"><span>Matches</span><span className="text-right">Competitors</span><span>Stations</span><span className="text-right">Incidents</span></div>
              <p className="mt-4 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-white/35">{nextEvent ? `Readiness for ${nextEvent.name}` : "Create an event to begin readiness checks."}</p>
            </motion.div>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["LIVE NOW", liveCount, "broadcasts", "text-cyan-200"], ["UPCOMING", upcomingCount, "events", "text-white"], ["ISSUES", openIncidentCount, "open incidents", openIncidentCount ? "text-rose-200" : "text-white"], ["EVENTS", tournaments.length, "in workspace", "text-white"]].map(([label, value, sub, tone], i) => <motion.div key={String(label)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }} className="surface-quiet p-4 sm:p-5"><p className="metric-label">{label}</p><p className={`mt-2 font-display text-3xl font-extrabold tracking-[.01em] ${tone}`}>{value}</p><p className="mt-0.5 text-[10px] text-white/30">{sub}</p></motion.div>)}</section>

          <section id="events" className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <div className="surface-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4"><div><p className="section-label text-cyan-300/70">Event radar</p><h2 className="section-heading mt-1 text-2xl">Your competitions</h2></div><Link href="/tournaments" className="font-mono text-[9px] font-bold uppercase tracking-[.12em] text-white/35 transition hover:text-white">View all →</Link></div>
              <div className="divide-y divide-white/[.07]">{tournaments.length ? tournaments.map((t) => <div key={t.id} className="group px-5 py-4 transition hover:bg-white/[.025] sm:py-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-white/90">{t.name}</p><span className={`rounded-full border px-2 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[.12em] ${statusTone(t.status)}`}>{t.status}</span></div><p className="mt-1.5 font-mono text-[8px] uppercase tracking-[.1em] text-white/25">{new Date(t.startDate).toLocaleDateString()} · {t.matches} matches · {t.competitors} competitors · {t.stations} stations</p></div><div className="flex shrink-0 gap-2"><Link href={`/admin/tournaments/${t.id}`} className="rounded-[9px] border border-white/10 px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[.1em] text-white/55 transition hover:border-white/20 hover:text-white">Manage</Link><Link href={`/tournaments/${t.slug ?? t.id}`} className="rounded-[9px] bg-white/[.08] px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[.1em] text-white transition hover:bg-white/[.12]">Open</Link></div></div></div>) : <div className="px-5 py-12 text-sm text-white/30">No events yet. Create your first competition to activate the command deck.</div>}</div>
            </div>
            <div id="operations" className="surface-card p-5"><p className="section-label text-fuchsia-300/70">Operations rail</p><h2 className="section-heading mt-1 text-2xl">Jump into the work</h2><div className="mt-5 grid gap-2">{[["Tournament operations", "/organizer", "CORE"], ["Tournament explorer", "/tournaments", "DISCOVER"], ["Broadcast control", "/multiview", "LIVE"], ["Teams & players", "/teams", "ROSTER"], ...(canManageOrganization ? [["Organization", "/organization/settings", "ADMIN"]] : [])].map(([label, href, tag]) => <Link key={label} href={href} className="group flex items-center justify-between rounded-[11px] border border-white/[.08] bg-black/20 px-4 py-3 text-sm text-white/65 transition hover:border-violet-300/25 hover:bg-white/[.04] hover:text-white"><span>{label}</span><span className="font-mono text-[7px] tracking-[.12em] text-white/20 group-hover:text-violet-200/60">{tag} · →</span></Link>)}</div><p className="mt-5 border-t border-white/[.07] pt-4 font-mono text-[8px] uppercase tracking-[.14em] text-white/20">Existing competition engines remain the source of truth</p></div>
          </section>

          <section id="insights" className="grid gap-3 md:grid-cols-3">{[["01", "Momentum", "Surface live matches, crowd activity and the next broadcast cue without leaving operations."], ["02", "Signal", "Turn incidents and readiness checks into a single visual priority queue for producers."], ["03", "Velocity", "Keep the competition engine underneath; V32 makes the workflow faster to scan and act on."]].map(([n, title, copy]) => <div key={n} className="surface-quiet p-5 sm:p-6"><span className="font-mono text-[8px] font-bold tracking-[.15em] text-white/20">{n}</span><h3 className="mt-7 font-display text-2xl font-bold uppercase tracking-[.03em]">{title}</h3><p className="mt-2 text-xs leading-5 text-white/35">{copy}</p></div>)}</section>
        </main>
      </div>
    </div>
  );
}
