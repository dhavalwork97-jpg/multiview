import Link from "next/link";

export default function TournamentNotFound() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="surface-card mx-auto max-w-2xl p-6 sm:p-10">
          <p className="page-kicker text-signal-live">Competition unavailable</p>
          <h1 className="page-title mt-2">Tournament not found.</h1>
          <p className="page-subtitle mt-3 max-w-xl">
            This competition may be private, removed, or no longer available at this link.
            Return to the competition hub to find another event.
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
