export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading tournament operations">
      <div className="page-container">
        <section className="surface-card p-5 sm:p-8">
          <div className="h-3 w-28 animate-pulse rounded bg-arena-700" />
          <div className="mt-4 h-9 max-w-xl animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-lg animate-pulse rounded bg-arena-800" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-card bg-arena-900" aria-hidden="true" />
            ))}
          </div>
          <div className="mt-6 h-44 animate-pulse rounded-card bg-arena-900" aria-hidden="true" />
          <p className="sr-only">Loading tournament operations data…</p>
        </section>
      </div>
    </main>
  );
}
