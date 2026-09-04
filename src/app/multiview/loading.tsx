export default function MultiViewLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading Multi-View">
      <div className="page-container">
        <header className="mb-6">
          <div className="h-3 w-36 animate-pulse rounded bg-arena-700" />
          <div className="mt-3 h-12 max-w-xl animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-2xl animate-pulse rounded bg-arena-800" />
        </header>
        <section className="surface-card overflow-hidden p-2 sm:p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="aspect-video animate-pulse rounded-card bg-arena-950" aria-hidden="true" />
            ))}
          </div>
        </section>
        <p className="sr-only">Loading live station signals…</p>
      </div>
    </main>
  );
}
