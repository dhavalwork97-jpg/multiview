"use client";

import { useEffect, useState } from "react";

type Person = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type Point = { day: string; total: number; reactions: number; presence: number; matches: number };

export function SocialHub() {
  const [friends, setFriends] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<Person & { following: boolean }>>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [friendsRes, followingRes, graphRes] = await Promise.all([
      fetch("/api/social/friends", { cache: "no-store" }),
      fetch("/api/social/follows?direction=following", { cache: "no-store" }),
      fetch("/api/social/activity/graph?days=30", { cache: "no-store" }),
    ]);
    if (friendsRes.ok) setFriends((await friendsRes.json()).friends ?? []);
    if (followingRes.ok) setFollowing((await followingRes.json()).users ?? []);
    if (graphRes.ok) setPoints((await graphRes.json()).points ?? []);
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
    if (res.ok) { setResults((items) => items.map((item) => item.id === person.id ? { ...item, following: !person.following } : item)); await refresh(); }
  }

  const max = Math.max(1, ...points.map((point) => point.total));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Community</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your social graph</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Follow people, build mutual friendships, and see how your FGC activity changes over time.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Find people</h2><p className="text-xs text-muted-foreground">Search by username or display name.</p></div></div>
          <div className="mt-4 flex gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder="Search creators and viewers" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            <button onClick={() => void search()} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Search</button>
          </div>
          {results.length > 0 && <div className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60">{results.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{person.displayName || person.username}</p><p className="truncate text-xs text-muted-foreground">@{person.username}</p></div><button disabled={busy === person.id} onClick={() => void toggleFollow(person)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50">{person.following ? "Following" : "Follow"}</button></div>)}</div>}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
          <h2 className="font-semibold">Friends</h2><p className="text-xs text-muted-foreground">People who follow each other.</p>
          <div className="mt-4 space-y-3">{friends.length ? friends.map((person) => <div key={person.id} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">{(person.displayName || person.username).slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{person.displayName || person.username}</p><p className="text-xs text-muted-foreground">@{person.username}</p></div></div>) : <p className="py-5 text-sm text-muted-foreground">No mutual friends yet. Find someone to follow above.</p>}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
        <div className="flex items-end justify-between"><div><h2 className="font-semibold">Activity graph</h2><p className="text-xs text-muted-foreground">Your social activity over the last 30 days.</p></div><span className="text-xs text-muted-foreground">{points.reduce((sum, point) => sum + point.total, 0)} events</span></div>
        <div className="mt-6 flex h-44 items-end gap-1 overflow-hidden">{points.map((point) => <div key={point.day} title={`${point.day}: ${point.total} events`} className="min-w-[6px] flex-1 rounded-t-md bg-primary/70" style={{ height: `${Math.max(4, (point.total / max) * 100)}%` }} />)}</div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>🔥 Reactions: {points.reduce((sum, point) => sum + point.reactions, 0)}</span><span>👥 Presence: {points.reduce((sum, point) => sum + point.presence, 0)}</span><span>🏆 Matches: {points.reduce((sum, point) => sum + point.matches, 0)}</span><span>Following: {following.length}</span></div>
      </section>
    </main>
  );
}