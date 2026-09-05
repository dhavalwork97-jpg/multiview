"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FGC Stream route error", error);
  }, [error]);

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="surface-card mx-auto max-w-2xl p-6 sm:p-10">
          <p className="page-kicker text-signal-live">Signal interruption</p>
          <h1 className="page-title mt-2">This page hit an unexpected error.</h1>
          <p className="page-subtitle mt-3 max-w-xl">
            The rest of FGC Stream is still available. Try the page again, or return to the competition hub.
          </p>
          {error.digest && (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Reference: {error.digest}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => reset()} className="action-primary min-h-11 px-5">
              Try again
            </button>
            <Link href="/tournaments" className="action-secondary min-h-11 px-5">
              Browse tournaments
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
