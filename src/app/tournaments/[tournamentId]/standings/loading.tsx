export default function StandingsLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading standings">
      <div className="page-container max-w-6xl">
        <div className="h-3 w-36 animate-pulse rounded bg-arena-700" />
        <header className="mt-4">
          <div className="h-12 w-52 animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-md animate-pulse rounded bg-arena-800" />
          <div className="mt-5 h-20 animate-pulse rounded-card bg-arena-900" />
        </header>
        <section className="mt-6 overflow-hidden rounded-card border border-arena-700 bg-arena-900">
          <div className="h-12 animate-pulse bg-arena-950" aria-hidden="true" />
          <div className="divide-y divide-arena-700">
            {[0, 1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-14 animate-pulse bg-arena-900" aria-hidden="true" />
            ))}
          </div>
        </section>
        <p className="sr-only">Loading competition standings…</p>
      </div>
    </main>
  );
}
