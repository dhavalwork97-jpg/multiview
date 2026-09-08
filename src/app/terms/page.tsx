export const metadata = { title: "Terms of Service | FGC Stream", description: "Terms governing use of FGC Stream." };

export default function TermsPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <article className="surface-card mx-auto max-w-4xl p-6 sm:p-10">
          <p className="page-kicker">Legal</p>
          <h1 className="page-title mt-2">Terms of Service</h1>
          <p className="mt-3 text-sm text-ink-muted">Last updated: September 8, 2026</p>
          <div className="prose prose-invert mt-8 max-w-none text-sm leading-7 text-ink-muted">
            <h2>1. Using FGC Stream</h2>
            <p>FGC Stream provides tools for discovering, watching, organizing and participating in esports competitions. You must provide accurate information, keep your account secure, and comply with applicable law and event rules.</p>
            <h2>2. Accounts and roles</h2>
            <p>Some features require an authenticated account. Organizer and administrator capabilities are permissioned separately. You are responsible for activity performed through your account.</p>
            <h2>3. User content</h2>
            <p>You retain rights in content you submit, subject to the licenses needed for FGC Stream to host, process, display and distribute that content as part of the service. Do not upload content you do not have permission to use.</p>
            <h2>4. Competition and broadcast content</h2>
            <p>Tournament organizers control their event rules, schedules and competition decisions. FGC Stream is a platform and does not guarantee the outcome, accuracy or availability of a third-party event.</p>
            <h2>5. Prohibited use</h2>
            <p>Do not abuse the service, bypass access controls, interfere with broadcasts, spam or harass other users, upload malicious code, impersonate another person, or attempt to gain unauthorized access.</p>
            <h2>6. Paid services</h2>
            <p>Paid plans and event services are subject to the pricing and purchase terms shown at checkout. Taxes, payment-provider rules and applicable refund terms may apply.</p>
            <h2>7. Availability</h2>
            <p>Live streams depend on networks, encoders, third-party media services and other infrastructure. We work to keep the platform available but cannot promise uninterrupted service.</p>
            <h2>8. Enforcement</h2>
            <p>We may restrict or suspend access where necessary to protect users, events, infrastructure or legal obligations. Appeals and reports are reviewed according to the applicable moderation process.</p>
            <h2>9. Changes</h2>
            <p>We may update these terms as the service evolves. Material changes will be communicated through the service when appropriate.</p>
            <h2>10. Contact</h2>
            <p>For legal, privacy, copyright or account requests, use the support/contact channel made available by FGC Stream or the relevant organizer for event-specific matters.</p>
            <p className="mt-8 text-xs text-ink-faint">This page is a product-level terms template and is not legal advice. Have counsel review it for the jurisdictions in which FGC Stream operates before paid/public launch.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
