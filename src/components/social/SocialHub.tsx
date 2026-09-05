"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Person = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type Point = { day: string; total: number; reactions: number; presence: number; matches: number };
type Activity = { id: string; type: string; message: string; createdAt: string; metadata: unknown };

function initials(person: Person) {
  return (person.displayName || person.username).slice(0, 1).toUpperCase();
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SocialHub() {
  const [friends, setFriends] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<Person & { following: boolean }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);

  async function refresh() {
    const [friendsRes, followingRes, graphRes, activityRes] = await Promise.all([
      fetch("/api/social/friends", { cache: "no-store" }),
      fetch("/api/social/follows?direction=following", { cache: "no-store" }),
      fetch("/api/social/activity/graph?days=30", { cache: "no-store" }),
      fetch("/api/social/activity?limit=12", { cache: "no-store" }),
    ]);
    if (friendsRes.ok) setFriends((await friendsRes.json()).friends ?? []);
    if (followingRes.ok) setFollowing((await followingRes.json()).users ?? []);
    if (graphRes.ok) setPoints((await graphRes.json()).points ?? []);
    if (activityRes.ok) setActivity((await activityRes.json()).events ?? []);
    setLoadingActivity(false);
  }

  useEffect(() => { void refresh(); }, []);

  async function search() {
    if (query.trim().length < 2) { setResults([]); return; }
    const res = await fetch(`/api/social/users?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
    if (res.ok) setResults((await res.json()).users ?? []);
  }

  async function toggleFollow(person: Person & { following: boolean }) {
    setBusy(person.id);
    const method = person.following ? "DELETE" : "POST";
    const res = await fetch(`/api/social/follows/${person.id}`, { method });
    setBusy(null);
    if (res.ok) {
      setResults((items) => items.map((item) => item.id === person.id ? { ...item, following: !person.following } : item));
      await refresh();
    }
  }

  const max = Math.max(1, ...points.map((point) => point.total));
  const eventTotal = useMemo(() => points.reduce((sum, point) => sum + point.total, 0), [points]);
  const reactionTotal = useMemo(() => points.reduce((sum, point) => sum + point.reactions, 0), [points]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-border/60 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3"><LiveBadge label="COMMUNITY" compact /><span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">The broadcast afterparty</span></div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Stay in the moment.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Follow the people you watch, discover what the community is reacting to, and jump straight back into the matches everyone is talking about.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/live" className="rounded-xl border border-border px-4 py-2.5 font-medium transition hover:bg-muted">Watch live</Link>
          <Link href="/matches" className="rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90">Browse matches</Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Following</p><p className="mt-2 text-3xl font-semibold">{following.length}</p><p className="mt-1 text-xs text-muted-foreground">People shaping your feed</p></div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Friends</p><p className="mt-2 text-3xl font-semibold">{friends.length}</p><p className="mt-1 text-xs text-muted-foreground">Mutual connections</p></div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Community signal</p><p className="mt-2 text-3xl font-semibold">{reactionTotal}</p><p className="mt-1 text-xs text-muted-foreground">Reactions across the last 30 days</p></div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
        <div className="space-y-8">
          <section>
            <SectionHeader title="Community pulse" description="Fresh activity from the FGC broadcast network." />
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card/50">
              {loadingActivity ? <div className="p-6 text-sm text-muted-foreground">Loading the latest community pulse…</div> : activity.length ? activity.map((event) => (
                <article key={event.id} className="border-b border-border/50 p-5 last:border-0">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">{event.type.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{event.type.replaceAll("_", " ")}</span><span className="text-xs text-muted-foreground">{relativeTime(event.createdAt)}</span></div>
                      <p className="mt-1 text-sm leading-6">{event.message}</p>
                    </div>
                  </div>
                </article>
              )) : <div className="p-6 text-sm text-muted-foreground">The feed is quiet right now. Jump into a live match and start the conversation.</div>}
            </div>
          </section>

          <section>
            <SectionHeader title="Your activity" description="A lightweight view of your community momentum." />
            <div className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-5">
              <div className="flex h-40 items-end gap-1 overflow-hidden" aria-label="30 day activity graph">
                {points.map((point) => <div key={point.day} title={`${point.day}: ${point.total} events`} className="min-w-[5px] flex-1 rounded-t-sm bg-primary/70" style={{ height: `${Math.max(4, (point.total / max) * 100)}%` }} />)}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span>{eventTotal} events</span><span>{reactionTotal} reactions</span><span>{points.reduce((sum, point) => sum + point.presence, 0)} presence signals</span><span>{points.reduce((sum, point) => sum + point.matches, 0)} match moments</span></div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border/60 bg-card/50 p-5">
            <SectionHeader title="Find your people" description="Search viewers, creators and competitors." />
            <div className="mt-4 flex gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder="Search username" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              <button onClick={() => void search()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Find</button>
            </div>
            {results.length > 0 && <div className="mt-4 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">{results.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 p-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials(person)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{person.displayName || person.username}</p><p className="truncate text-xs text-muted-foreground">@{person.username}</p></div></div><button disabled={busy === person.id} onClick={() => void toggleFollow(person)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50">{person.following ? "Following" : "Follow"}</button></div>)}</div>}
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/50 p-5">
            <SectionHeader title="Friends" description="Your mutual watch crew." actionLabel="Live" href="/live" />
            <div className="mt-4 space-y-3">{friends.length ? friends.slice(0, 6).map((person) => <div key={person.id} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">{initials(person)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{person.displayName || person.username}</p><p className="text-xs text-muted-foreground">@{person.username}</p></div></div>) : <p className="py-3 text-sm text-muted-foreground">No mutual friends yet. Find someone to follow.</p>}</div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Keep the loop going</p>
            <div className="mt-4 space-y-2 text-sm"><Link href="/social" className="block rounded-xl border border-border/60 px-4 py-3 font-medium hover:bg-muted">Social graph →</Link><Link href="/live" className="block rounded-xl border border-border/60 px-4 py-3 font-medium hover:bg-muted">Live now →</Link><Link href="/matches?status=LIVE" className="block rounded-xl border border-border/60 px-4 py-3 font-medium hover:bg-muted">Live matches →</Link></div>
          </section>
        </aside>
      </section>
    </main>
  );
}
