"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Match = {
  id: string;
  round?: string | null;
  status: string;
  playerOneScore?: number | null;
  playerTwoScore?: number | null;
  startedAt?: string | null;
  hypeScore?: number | null;
  playerOne?: { gamertag?: string | null } | null;
  playerTwo?: { gamertag?: string | null } | null;
  station?: { label?: string | null; status?: string | null } | null;
  tournament?: { name?: string | null; game?: string | null; slug?: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = { LIVE: "Live", QUEUED: "Upcoming", COMPLETED: "Completed", DISPUTED: "Disputed" };

function MatchRow({ match }: { match: Match }) {
  const live = match.status === "LIVE";
  const one = match.playerOne?.gamertag || "Side A";
  const two = match.playerTwo?.gamertag || "Side B";
  const score = `${match.playerOneScore ?? 0} — ${match.playerTwoScore ?? 0}`;

  return (
    <Link href={live ? `/watch/${match.id}` : `/watch/${match.id}`} className="group block rounded-card border border-arena-700 bg-arena-900 p-4 transition hover:border-arena-500 hover:bg-arena-800/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {live ? <LiveBadge compact /> : <span className="status-neutral">{STATUS_LABELS[match.status] ?? match.status}</span>}
          <span className="section-label">{match.tournament?.game || "Competition"}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{match.station?.label || match.round || "Match"}</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="truncate font-semibold text-ink">{one}</span>
        <span className="font-mono text-lg font-bold tabular-nums text-ink">{score}</span>
        <span className="truncate text-right font-semibold text-ink">{two}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-arena-700/70 pt-3 text-xs text-ink-muted">
        <span>{match.tournament?.name || "Tournament"}</span>
        <span className="font-mono tabular-nums">{live ? `${match.hypeScore ?? 0} hype` : match.round || "—"} · View →</span>
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState("LIVE");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/matches?status=${status}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to load matches"); return res.json(); })
      .then((data) => { if (!cancelled) setMatches(Array.isArray(data.matches) ? data.matches : []); })
      .catch(() => { if (!cancelled) setMatches([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  const summary = useMemo(() => {
    if (status === "LIVE") return "Active matches, scores and broadcast stations.";
    if (status === "QUEUED") return "What is coming up next across the competition network.";
    if (status === "COMPLETED") return "Recent results and match history.";
    return "Matches requiring attention.";
  }, [status]);

  return (
    <main className="page-shell space-y-8 pb-16 pt-8 sm:pt-10">
      <section>
        <p className="section-label">Competition index</p>
        <h1 className="display-heading mt-2 text-4xl sm:text-5xl">Matches</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-muted">Find the match first. Then watch, follow the score, or move into the tournament context.</p>
      </section>

      <section className="flex flex-wrap gap-2 border-y border-arena-700 py-3" aria-label="Match status filters">
        {["LIVE", "QUEUED", "COMPLETED", "DISPUTED"].map((item) => (
          <button key={item} type="button" onClick={() => setStatus(item)} className={`min-h-10 rounded-card border px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition ${status === item ? "border-signal-live/50 bg-arena-800 text-ink" : "border-transparent text-ink-muted hover:border-arena-600 hover:text-ink"}`}>
            {STATUS_LABELS[item]}
          </button>
        ))}
      </section>

      <section>
        <SectionHeader eyebrow={status === "LIVE" ? "On air" : "Match center"} title={STATUS_LABELS[status] ?? status} description={summary} />
        <div className="mt-5 space-y-3">
          {loading && <p className="text-sm text-ink-muted">Loading matches…</p>}
          {!loading && matches.length === 0 && <div className="rounded-card border border-dashed border-arena-600 p-10 text-center text-sm text-ink-muted">No {STATUS_LABELS[status]?.toLowerCase() || "matching"} matches right now.</div>}
          {!loading && matches.map((match) => <MatchRow key={match.id} match={match} />)}
        </div>
      </section>
    </main>
  );
}
