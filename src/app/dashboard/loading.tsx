export default function DashboardLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-container">
        <header className="surface-card mb-8 p-4 sm:p-5">
          <div className="h-3 w-40 animate-pulse rounded bg-arena-700" />
          <div className="mt-3 h-10 max-w-xl animate-pulse rounded bg-arena-800" />
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="h-11 w-24 animate-pulse rounded-card bg-arena-900" aria-hidden="true" />
            <div className="h-11 w-28 animate-pulse rounded-card bg-arena-900" aria-hidden="true" />
            <div className="h-11 w-36 animate-pulse rounded-card bg-arena-900" aria-hidden="true" />
          </div>
        </header>

        <div className="space-y-10">
          {["Recommended", "Trending"].map((section) => (
            <section key={section} aria-hidden="true">
              <div className="h-3 w-24 animate-pulse rounded bg-arena-700" />
              <div className="mt-3 h-8 w-40 animate-pulse rounded bg-arena-800" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="surface-card h-32 animate-pulse" />
                ))}
              </div>
            </section>
          ))}

          <section className="surface-card p-5" aria-hidden="true">
            <div className="h-3 w-24 animate-pulse rounded bg-arena-700" />
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-arena-800" />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-card bg-arena-900" />
              ))}
            </div>
          </section>

          <section aria-hidden="true">
            <div className="h-3 w-28 animate-pulse rounded bg-arena-700" />
            <div className="mt-3 h-8 w-44 animate-pulse rounded bg-arena-800" />
            <div className="surface-card mt-4 h-56 animate-pulse" />
          </section>
        </div>
        <p className="sr-only">Loading your competition workspace…</p>
      </div>
    </main>
  );
}
