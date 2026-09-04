export default function TournamentLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Loading tournament">
      <div className="page-container max-w-6xl">
        <div className="h-3 w-32 animate-pulse rounded bg-arena-700" />
        <header className="mt-4">
          <div className="h-12 max-w-2xl animate-pulse rounded bg-arena-800" />
          <div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-arena-800" />
          <div className="mt-5 h-10 animate-pulse rounded-card bg-arena-900" />
        </header>
        <div className="mt-6 space-y-6">
          <section className="surface-card h-36 animate-pulse p-5" aria-hidden="true" />
          <section className="grid gap-4 md:grid-cols-2">
            <div className="surface-card h-64 animate-pulse" aria-hidden="true" />
            <div className="surface-card h-64 animate-pulse" aria-hidden="true" />
          </section>
          <section className="surface-card h-80 animate-pulse" aria-hidden="true" />
        </div>
        <p className="sr-only">Loading tournament details…</p>
      </div>
    </main>
  );
}
