export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading tournament control room">
      <div className="page-container">
        <section className="surface-card p-5 sm:p-8">
          <div className="h-3 w-32 animate-pulse rounded bg-arena-700" />
          <div className="mt-4 h-9 max-w-xl animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-md animate-pulse rounded bg-arena-800" />
          <div className="mt-7 h-10 w-40 animate-pulse rounded-card bg-arena-800" />
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-card bg-arena-900" aria-hidden="true" />
            ))}
          </div>
          <p className="sr-only">Loading tournament control room data…</p>
        </section>
      </div>
    </main>
  );
}
