import { BroadcastFrame } from "@/components/broadcast/BroadcastFrame";

export default function LiveScoreboardOverlay() {
  return (
    <BroadcastFrame game="Valorant" className="min-h-screen bg-transparent">
      <main className="flex min-h-screen items-start justify-center p-10">
        <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-black/75 shadow-2xl backdrop-blur-md">
          <div className="flex items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-5 px-7 py-5">
              <div className="h-14 w-14 rounded-xl border border-white/15 bg-white/10" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Team A</div>
                <div className="truncate text-2xl font-black uppercase tracking-tight">ALPHA SQUAD</div>
              </div>
            </div>
            <div className="flex items-center gap-4 border-x border-white/10 px-8">
              <span className="text-4xl font-black tabular-nums">12</span>
              <span className="text-sm font-bold text-white/35">:</span>
              <span className="text-4xl font-black tabular-nums">9</span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-5 px-7 py-5 text-right">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Team B</div>
                <div className="truncate text-2xl font-black uppercase tracking-tight">OMEGA FIVE</div>
              </div>
              <div className="h-14 w-14 rounded-xl border border-white/15 bg-white/10" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.04] px-7 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
            <span>FGC CHAMPIONSHIP • SEMIFINAL</span>
            <span>BEST OF 3 • LIVE</span>
          </div>
        </section>
      </main>
    </BroadcastFrame>
  );
}
