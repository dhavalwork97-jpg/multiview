export default function WatchLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading match">
      <div className="page-container max-w-6xl">
        <header className="mb-6">
          <div className="h-3 w-32 animate-pulse rounded bg-arena-700" />
          <div className="mt-3 h-12 max-w-2xl animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-arena-800" />
        </header>
        <section className="surface-card overflow-hidden" aria-hidden="true">
          <div className="aspect-video animate-pulse bg-arena-950" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-card bg-arena-900" />
            <div className="h-20 animate-pulse rounded-card bg-arena-900" />
          </div>
        </section>
        <p className="sr-only">Loading live match and video signal…</p>
      </div>
    </main>
  );
}
