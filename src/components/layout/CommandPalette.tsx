"use client";

import { useEffect, useMemo, useState } from "react";

const commands = [
  { label: "Dashboard", hint: "Open workspace", href: "/dashboard" },
  { label: "Tournaments", hint: "Manage competitions", href: "/admin/tournaments" },
  { label: "Broadcast", hint: "Production studio", href: "/admin/broadcast" },
  { label: "Analytics", hint: "Performance and audience", href: "/analytics" },
  { label: "Demo · Admin", hint: "Product preview", href: "/demo/admin" },
  { label: "Demo · Organizer", hint: "Organizer preview", href: "/demo/organizer" },
  { label: "Demo · Control Room", hint: "Broadcast preview", href: "/demo/control-room" },
  { label: "Demo · MultiView", hint: "Operator monitor wall", href: "/demo/multiview" },
  { label: "Demo · Overlay", hint: "Overlay studio", href: "/demo/overlay" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? commands.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(normalized)) : commands;
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => document.getElementById("fgc-command-search")?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="FGC command palette" className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-violet-400/20 bg-[#0c0e14] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="border-b border-white/10 p-3"><input id="fgc-command-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FGC…" className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/30" aria-label="Search commands" /></div>
        <div className="max-h-[55vh] overflow-auto p-2">
          {filtered.length ? filtered.map((command) => <a key={command.href} href={command.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-white no-underline transition hover:bg-white/5 focus-visible:bg-white/5"><span><strong className="block text-sm">{command.label}</strong><small className="text-white/35">{command.hint}</small></span><kbd className="rounded border border-white/10 px-2 py-1 text-[9px] text-white/30">OPEN</kbd></a>) : <div className="px-3 py-8 text-center text-sm text-white/35">No commands found.</div>}
        </div>
        <div className="border-t border-white/10 px-3 py-2 text-[9px] uppercase tracking-[.15em] text-white/25">Ctrl/Cmd K · Esc to close</div>
      </div>
    </div>
  );
}
