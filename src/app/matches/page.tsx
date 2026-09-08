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
    <Link href={`/watch/${match.id}`} className={`group block surface-card surface-card-interactive p-4 sm:p-5 ${live ? "border-signal-live/20" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">{live ? <LiveBadge compact /> : <span className="status-neutral">{STATUS_LABELS[match.status] ?? match.status}</span>}<span className="section-label">{match.tournament?.game || "Competition"}</span></div>
        <span className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">{match.station?.label || match.round || "Match"}</span>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="truncate font-semibold text-ink">{one}</span>
        <span className="score-value">{match.playerOneScore ?? 0} — {match.playerTwoScore ?? 0}</span>
        <span className="truncate text-right font-semibold text-ink">{two}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-arena-700/70 pt-3 text-xs text-ink-muted">
        <span>{match.tournament?.name || "Tournament"}</span>
        <span className="font-mono tabular-nums">{live ? `${match.hypeScore ?? 0} hype` : match.round || "—"} · View →</span>
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
      <header className="ds-section !pb-8">
        <p className="page-kicker">Competition index / match center</p><h1 className="page-title mt-2 text-5xl sm:text-6xl">Matches</h1><p className="page-subtitle mt-3 text-base">Find the match first. Then watch, follow the score, or move into the tournament context.</p>
      </header>
      <section className="surface-rail -mx-4 overflow-x-auto px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Match status filters">
        <div className="page-container flex gap-2">{Object.keys(STATUS_LABELS).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`game-tab ${status === item ? "game-tab-active" : ""}`}>{STATUS_LABELS[item]}</button>)}</div>
      </section>
      <section className="ds-section"><SectionHeader eyebrow={status === "LIVE" ? "01 / on air" : "01 / match center"} title={STATUS_LABELS[status] ?? status} description={summary} />
        <div className="mt-5 space-y-3">{loading && <div className="surface-quiet p-8 text-center text-sm text-ink-muted" aria-live="polite">Loading matches…</div>}{!loading && matches.length === 0 && <div className="empty-state"><p className="page-kicker">No signal</p><p className="mt-2 text-sm text-ink-muted">No {STATUS_LABELS[status]?.toLowerCase() || "matching"} matches right now.</p></div>}{!loading && matches.map((match) => <MatchRow key={match.id} match={match} />)}</div>
      </section>
    </div></main>
  );
}
