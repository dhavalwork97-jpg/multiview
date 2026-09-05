"use client";
export function LivePresenceBar({ count }: { count: number }) { return <div className="flex items-center gap-2 text-xs text-ink-muted" aria-live="polite"><span className="h-2 w-2 rounded-full bg-signal-live animate-live-pulse" /><strong className="text-ink">{count}</strong><span>watching now</span></div>; }
