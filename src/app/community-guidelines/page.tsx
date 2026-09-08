export const metadata = { title: "Community Guidelines | FGC Stream", description: "Community standards for FGC Stream viewers, players and organizers." };

export default function CommunityGuidelinesPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <article className="surface-card mx-auto max-w-4xl p-6 sm:p-10">
          <p className="page-kicker">Trust & safety</p>
          <h1 className="page-title mt-2">Community Guidelines</h1>
          <p className="mt-3 text-sm text-ink-muted">Last updated: September 8, 2026</p>
          <div className="prose prose-invert mt-8 max-w-none text-sm leading-7 text-ink-muted">
            <h2>Compete and watch in good faith</h2>
            <p>FGC Stream is for competition, fandom and community. Keep chat, profiles, tournament participation and shared content respectful and relevant.</p>
            <h2>Not allowed</h2>
            <ul><li>Threats, targeted harassment or hateful abuse.</li><li>Sexual exploitation or sexual content involving minors.</li><li>Fraud, impersonation, doxxing or sharing private information.</li><li>Spam, scams, malicious links, malware or coordinated disruption.</li><li>Cheating, match manipulation or attempts to compromise tournament integrity.</li><li>Content that infringes another person&apos;s intellectual-property rights.</li></ul>
            <h2>Live chat</h2>
            <p>Organizers and moderators may use timeouts, message removal, slow mode, blocked terms or bans to keep event chat usable. Platform administrators may take additional action for serious or repeated violations.</p>
            <h2>Reports</h2>
            <p>When reporting content, provide enough context for a moderator to identify the event, user or message. Do not use reports to harass other users or manufacture evidence.</p>
            <h2>Tournament integrity</h2>
            <p>Event-specific rules remain controlled by the organizer. FGC Stream may preserve relevant records and restrict accounts where activity threatens competition integrity or platform security.</p>
            <h2>Enforcement</h2>
            <p>Actions may include content removal, feature restrictions, temporary suspension or permanent account restriction. Severity, repetition and context are considered.</p>
            <p className="mt-8 text-xs text-ink-faint">These guidelines are a product-level policy and may be supplemented by event-specific rules and applicable law.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
