"use client";

import { useEffect, useState } from "react";
import { getBroadcastTheme } from "@/lib/broadcast/themes";

export default function CountdownOverlay() {
  const [seconds, setSeconds] = useState(10);
  const theme = getBroadcastTheme("Valorant");
  useEffect(() => { const timer = window.setInterval(() => setSeconds((value) => value > 0 ? value - 1 : 10), 1000); return () => window.clearInterval(timer); }, []);
  return <div className="flex min-h-screen items-center justify-center bg-[#05060a] text-white"><div className="text-center"><div className="text-xs font-bold uppercase tracking-[.5em] text-white/40">MATCH STARTING</div><div className="mt-5 text-[13rem] font-black leading-none tabular-nums" style={{ color: theme.accent, textShadow: `0 0 90px ${theme.glow}` }}>{seconds}</div><div className="mt-6 text-sm font-bold uppercase tracking-[.4em] text-white/35">FGC LIVE BROADCAST</div></div></div>;
}
