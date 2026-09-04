export default function TournamentsLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading tournaments">
      <div className="page-container">
        <header className="mb-6 sm:mb-8">
          <div className="h-3 w-28 animate-pulse rounded bg-arena-700" />
          <div className="mt-3 h-12 max-w-md animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-arena-800" />
        </header>
        <section className="surface-card mb-6 space-y-3 p-3 sm:p-4">
          <div className="h-11 animate-pulse rounded-card bg-arena-900" />
          <div className="h-10 animate-pulse rounded-card bg-arena-900" />
          <div className="h-10 animate-pulse rounded-card bg-arena-900" />
        </section>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="surface-card h-52 animate-pulse p-5" aria-hidden="true" />
          ))}
        </div>
        <p className="sr-only">Loading tournament discovery…</p>
      </div>
    </main>
  );
}
