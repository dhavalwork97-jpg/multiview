export const metadata = { title: "Refunds | FGC Stream", description: "Refund information for FGC Stream purchases and event services." };

export default function RefundsPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <article className="surface-card mx-auto max-w-4xl p-6 sm:p-10">
          <p className="page-kicker">Billing</p>
          <h1 className="page-title mt-2">Refunds & Cancellations</h1>
          <p className="mt-3 text-sm text-ink-muted">Last updated: September 8, 2026</p>
          <div className="prose prose-invert mt-8 max-w-none text-sm leading-7 text-ink-muted">
            <h2>Subscriptions</h2>
            <p>Subscription cancellations stop future renewals. Access normally continues through the paid period unless the purchase terms shown at checkout state otherwise.</p>
            <h2>Event packages</h2>
            <p>Event services may involve reserved infrastructure, setup work and scheduled support. Cancellation and refund eligibility should follow the terms shown on the applicable order or agreement.</p>
            <h2>Payment failures</h2>
            <p>Failed recurring payments may place an account into a past-due state. The account may regain paid access after the payment provider successfully resolves the outstanding charge.</p>
            <h2>Requests</h2>
            <p>Include the relevant account or order context when requesting a refund. Payment-provider processing times may affect when a refund appears in the original payment method.</p>
            <p className="mt-8 text-xs text-ink-faint">This page is a product-level refund-policy template. The final policy and consumer-law disclosures should be reviewed for the jurisdictions and payment methods used by FGC Stream.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
