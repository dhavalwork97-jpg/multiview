export const metadata = { title: "Privacy | FGC Stream", description: "How FGC Stream handles account, usage and event data." };

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <article className="surface-card mx-auto max-w-4xl p-6 sm:p-10">
          <p className="page-kicker">Legal</p>
          <h1 className="page-title mt-2">Privacy Notice</h1>
          <p className="mt-3 text-sm text-ink-muted">Last updated: September 8, 2026</p>
          <div className="prose prose-invert mt-8 max-w-none text-sm leading-7 text-ink-muted">
            <h2>What we collect</h2>
            <p>Depending on the features you use, FGC Stream may process account identifiers, profile information, tournament and player data, follows and social activity, viewing and interaction events, support requests, and organizer event data.</p>
            <h2>Why we use it</h2>
            <p>We use information to authenticate accounts, operate competitions, provide streams and interactive features, personalize discovery, protect the service, measure reliability, process paid services, and communicate service or event notifications.</p>
            <h2>Third-party services</h2>
            <p>FGC Stream uses service providers for identity, payments, hosting, databases, media delivery, realtime communications and storage. Those providers process data according to their own agreements and applicable privacy requirements.</p>
            <h2>Public information</h2>
            <p>Competition information, player profiles, results, public event pages, clips and organizer-published content may be visible to other users or the public. Do not publish personal information that you do not want displayed publicly.</p>
            <h2>Retention</h2>
            <p>We retain information for as long as needed to operate the service, maintain competition records, meet contractual or legal obligations, resolve disputes, prevent abuse and maintain appropriate security records.</p>
            <h2>Your choices</h2>
            <p>Where applicable, you may request access, correction or deletion of personal information and adjust available notification or profile settings. Some competition records may need to be retained for integrity, accounting or legal reasons.</p>
            <h2>Security</h2>
            <p>We use authentication controls, server-side authorization, input validation, signed webhooks, encryption in transit and security monitoring practices. No internet service can guarantee absolute security.</p>
            <h2>Children</h2>
            <p>FGC Stream is not intended to knowingly collect personal information from children in violation of applicable law. Organizers are responsible for following age and eligibility requirements for their events.</p>
            <h2>Updates</h2>
            <p>This notice may change as the platform and legal requirements evolve. The latest version will be published here.</p>
            <p className="mt-8 text-xs text-ink-faint">This page is a product-level privacy notice template and is not legal advice. A jurisdiction-specific privacy review should be completed before public launch.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
