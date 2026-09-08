export const metadata = { title: "Copyright | FGC Stream", description: "Copyright and takedown policy for FGC Stream." };

export default function CopyrightPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <article className="surface-card mx-auto max-w-4xl p-6 sm:p-10">
          <p className="page-kicker">Trust & safety</p>
          <h1 className="page-title mt-2">Copyright & Takedowns</h1>
          <p className="mt-3 text-sm text-ink-muted">Last updated: September 8, 2026</p>
          <div className="prose prose-invert mt-8 max-w-none text-sm leading-7 text-ink-muted">
            <h2>Respect rights</h2>
            <p>Upload, broadcast, clip or publish only content you are authorized to use. Tournament organizers are responsible for rights they bring to an event, including game, music, sponsor and broadcast assets.</p>
            <h2>Copyright complaints</h2>
            <p>A rights holder should provide a clear identification of the protected work, the material alleged to infringe it, sufficient information to locate the material, contact information, a good-faith statement, and a statement that the information is accurate and the requester is authorized to act.</p>
            <h2>Counter-notices</h2>
            <p>Where applicable, a user may submit a counter-notice explaining why the material was removed in error. We may forward legally required information to the complaining party and may restore material when required or permitted.</p>
            <h2>Repeat infringement</h2>
            <p>Accounts associated with repeated or serious infringement may lose upload, clipping, broadcast or other platform privileges.</p>
            <p className="mt-8 text-xs text-ink-faint">This is a product-level copyright policy template and is not legal advice. A qualified copyright professional should review the final notice-and-takedown process for applicable jurisdictions.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
