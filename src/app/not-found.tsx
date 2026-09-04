import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell" aria-labelledby="not-found-title">
      <div className="page-container">
        <section className="surface-card mx-auto max-w-2xl p-6 sm:p-10">
          <p className="page-kicker text-signal-live">Signal not found</p>
          <h1 id="not-found-title" className="page-title mt-2">
            That competition or page does not exist.
          </h1>
          <p className="page-subtitle mt-3 max-w-xl">
            The link may be outdated, private, or the competition may have been removed. Return to the competition hub to keep watching.
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
