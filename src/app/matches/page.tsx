"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Match = {
  id: string; round?: string | null; status: string; playerOneScore?: number | null; playerTwoScore?: number | null; startedAt?: string | null; hypeScore?: number | null;
  playerOne?: { gamertag?: string | null } | null; playerTwo?: { gamertag?: string | null } | null;
  station?: { label?: string | null; status?: string | null } | null;
  tournament?: { name?: string | null; game?: string | null; slug?: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = { LIVE: "Live", QUEUED: "Upcoming", COMPLETED: "Completed", DISPUTED: "Disputed" };

function MatchRow({ match }: { match: Match }) {
  const live = match.status === "LIVE";
  const one = match.playerOne?.gamertag || "Side A";
  const two = match.playerTwo?.gamertag || "Side B";
  return (
    <Link href={`/watch/${match.id}`} className={`group block surface-card surface-card-interactive overflow-hidden p-0 ${live ? "border-signal-live/30" : ""}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.65fr)]">
        <div className="relative p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,247,197,.07),transparent_40%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">{live ? <LiveBadge compact /> : <span className="status-neutral">{STATUS_LABELS[match.status] ?? match.status}</span>}<span className="section-label">{match.tournament?.game || "Competition"}</span></div>
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">{match.station?.label || match.round || "Match"}</span>
          </div>
          <div className="relative mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
            <div className="min-w-0"><p className="truncate font-display text-2xl uppercase tracking-wide sm:text-3xl">{one}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Side A</p></div>
            <div className="text-center"><p className="score-value text-3xl sm:text-4xl">{match.playerOneScore ?? 0} — {match.playerTwoScore ?? 0}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-faint">{live ? "Current score" : "Final score"}</p></div>
            <div className="min-w-0 text-right"><p className="truncate font-display text-2xl uppercase tracking-wide sm:text-3xl">{two}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Side B</p></div>
          </div>
        </div>
        <div className="border-t border-arena-700 bg-arena-950/45 p-5 lg:border-l lg:border-t-0 sm:p-6">
          <p className="metric-label">Tournament</p><p className="mt-1 truncate font-semibold text-ink">{match.tournament?.name || "Tournament"}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="surface-quiet p-3"><p className="metric-label">Station</p><p className="mt-1 truncate font-mono text-xs text-ink-muted">{match.station?.label || "—"}</p></div>
            <div className="surface-quiet p-3"><p className="metric-label">Signal</p><p className="mt-1 font-mono text-xs font-bold text-signal-live">{live ? `${match.hypeScore ?? 0} hype` : "Available"}</p></div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-arena-700 pt-4"><span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{match.round || "Match center"}</span><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted group-hover:text-signal-live">Open match →</span></div>
        </div>
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]); const [status, setStatus] = useState("LIVE"); const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; setLoading(true); fetch(`/api/matches?status=${status}`).then((res) => { if (!res.ok) throw new Error("Failed to load matches"); return res.json(); }).then((data) => { if (!cancelled) setMatches(Array.isArray(data.matches) ? data.matches : []); }).catch(() => { if (!cancelled) setMatches([]); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [status]);
  const summary = useMemo(() => status === "LIVE" ? "Active matches, scores and broadcast stations." : status === "QUEUED" ? "What is coming up next across the competition network." : status === "COMPLETED" ? "Recent results and match history." : "Matches requiring attention.", [status]);

  return (
    <main className="page-shell"><div className="page-container">
      <header className="relative overflow-hidden border-b border-arena-700 pb-8 pt-3 sm:pb-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-corner-p2/[.08] blur-[90px]" />
        <p className="page-kicker">Competition index / match center</p><div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="page-title text-5xl sm:text-7xl">Matches</h1><p className="page-subtitle max-w-2xl text-base">A broadcast-first view of the competition network. Find the matchup, read the score, then move straight into the live experience.</p></div><div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-arena-700 bg-arena-700"><div className="bg-arena-950 px-4 py-3"><p className="metric-label">Mode</p><p className="mt-1 font-mono text-xs font-bold text-signal-live">{STATUS_LABELS[status]}</p></div><div className="bg-arena-950 px-4 py-3"><p className="metric-label">Loaded</p><p className="mt-1 font-mono text-xs font-bold text-ink">{matches.length.toString().padStart(2, "0")}</p></div></div></div>
      </header>
      <section className="surface-rail -mx-4 mt-6 overflow-x-auto px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Match status filters"><div className="page-container flex gap-2">{Object.keys(STATUS_LABELS).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={status === item} className={`game-tab ${status === item ? "game-tab-active" : ""}`}>{STATUS_LABELS[item]}</button>)}</div></section>
      <section className="ds-section"><SectionHeader eyebrow={status === "LIVE" ? "01 / on air" : "01 / match center"} title={STATUS_LABELS[status] ?? status} description={summary} /><div className="mt-5 space-y-3">{loading && <div className="surface-quiet p-10 text-center text-sm text-ink-muted" aria-live="polite">Loading match signal…</div>}{!loading && matches.length === 0 && <div className="empty-state"><p className="page-kicker">No signal</p><p className="mt-2 text-sm text-ink-muted">No {STATUS_LABELS[status]?.toLowerCase() || "matching"} matches right now.</p></div>}{!loading && matches.map((match) => <MatchRow key={match.id} match={match} />)}</div></section>
    </div></main>
  );
}
