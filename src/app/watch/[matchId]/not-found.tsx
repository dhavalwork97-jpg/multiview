import Link from "next/link";

export default function MatchNotFound() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="surface-card mx-auto max-w-2xl p-6 sm:p-10">
          <p className="page-kicker text-signal-live">Match unavailable</p>
          <h1 className="page-title mt-2">This match is no longer available.</h1>
          <p className="page-subtitle mt-3 max-w-xl">
            The match may have been removed, is not public, or the viewing link is out of date.
            Browse the competition hub to find the current event and matches.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/tournaments" className="action-primary min-h-11 px-5">
              Browse tournaments
            </Link>
            <Link href="/" className="action-secondary min-h-11 px-5">
              Go home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
