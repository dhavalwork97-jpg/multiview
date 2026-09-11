import { motion } from "framer-motion";
import { getBroadcastTheme } from "@/lib/broadcast/themes";

export function BroadcastIntro({ game = "Valorant", tournament = "FGC Championship" }: { game?: string; tournament?: string }) {
  const theme = getBroadcastTheme(game);
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060a] text-white"><div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 35%, ${theme.glow}, transparent 45%), linear-gradient(135deg, ${theme.surface}, #05060a)` }} /><motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8 }} className="relative text-center"><div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-3xl font-black shadow-2xl" style={{ boxShadow: `0 0 80px ${theme.glow}` }}>FGC</div><div className="text-sm font-bold uppercase tracking-[.45em] text-white/45">{tournament}</div><h1 className="mt-4 text-6xl font-black uppercase tracking-tight">{game}</h1><div className="mx-auto mt-8 h-1 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentAlt})` }} /></motion.div></div>;
}

export function BroadcastVs({ game = "Valorant", teamA = "ALPHA", teamB = "OMEGA", format = "BEST OF 3" }: { game?: string; teamA?: string; teamB?: string; format?: string }) {
  const theme = getBroadcastTheme(game);
  return <div className="flex min-h-screen items-center justify-center bg-[#05060a] p-12 text-white"><motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white/[.035] p-12 text-center backdrop-blur-xl"><div className="text-xs font-bold uppercase tracking-[.45em] text-white/40">{game} • {format}</div><div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-10"><div className="text-right"><div className="text-6xl font-black uppercase">{teamA}</div><div className="mt-2 text-xs font-bold uppercase tracking-[.3em] text-white/35">TEAM A</div></div><div className="text-7xl font-black italic" style={{ color: theme.accent }}>VS</div><div className="text-left"><div className="text-6xl font-black uppercase">{teamB}</div><div className="mt-2 text-xs font-bold uppercase tracking-[.3em] text-white/35">TEAM B</div></div></div><div className="mx-auto mt-12 h-px max-w-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent" /><div className="mt-5 text-sm font-semibold uppercase tracking-[.3em] text-white/40">FGC LIVE BROADCAST</div></motion.div></div>;
}

export function BroadcastLowerThird({ name = "PLAYER NAME", subtitle = "TEAM • PLAYER", game = "Valorant" }: { name?: string; subtitle?: string; game?: string }) {
  const theme = getBroadcastTheme(game);
  return <div className="flex min-h-screen items-end bg-transparent p-12"><motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="relative overflow-hidden rounded-r-2xl border border-white/15 bg-black/85 px-7 py-5 shadow-2xl backdrop-blur-md"><div className="absolute inset-y-0 left-0 w-1" style={{ background: theme.accent }} /><div className="text-2xl font-black uppercase tracking-tight text-white">{name}</div><div className="mt-1 text-[11px] font-bold uppercase tracking-[.28em] text-white/45">{subtitle}</div></motion.div></div>;
}

export function BroadcastWinner({ winner = "CHAMPIONS", score = "3 — 1", game = "Valorant" }: { winner?: string; score?: string; game?: string }) {
  const theme = getBroadcastTheme(game);
  return <div className="flex min-h-screen items-center justify-center bg-[#05060a] text-center text-white"><motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} className="relative"><div className="mx-auto mb-7 flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 text-5xl">🏆</div><div className="text-xs font-bold uppercase tracking-[.5em] text-white/40">MATCH WINNER</div><h1 className="mt-5 text-7xl font-black uppercase" style={{ textShadow: `0 0 60px ${theme.glow}` }}>{winner}</h1><div className="mt-5 text-4xl font-black tabular-nums">{score}</div><div className="mt-4 text-xs font-bold uppercase tracking-[.35em] text-white/35">{game} • FGC BROADCAST</div></motion.div></div>;
}
