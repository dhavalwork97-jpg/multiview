# FGC Stream — Production Legal Counsel Review

**Status: COUNSEL REVIEW REQUIRED — NOT LEGAL APPROVAL**  
**Prepared:** September 8, 2026

This checklist records the production legal surfaces that require review by qualified counsel before public/paid launch. Product and engineering review cannot substitute for jurisdiction-specific legal advice.

## Documents currently published

- `/terms` — Terms of Service
- `/privacy` — Privacy Notice
- `/community-guidelines` — Community Guidelines
- `/copyright` — Copyright & Takedowns
- `/refunds` — Refunds & Cancellations
- `SECURITY.md` — security posture and reporting guidance
- `/.well-known/security.txt` — security contact/policy metadata

## Counsel approval checklist

### 1. Contracting / Terms

Counsel should confirm:

- Legal entity name, registered address and contracting jurisdiction are identified.
- Governing law, venue and dispute-resolution provisions are appropriate.
- Account eligibility/minimum age and parental-consent rules are explicit.
- Organizer-specific responsibilities and event-rule precedence are enforceable.
- User-content license scope, sublicensing, publicity rights and termination effects are appropriate.
- Suspension/termination, appeals and account-data consequences are adequately defined.
- Warranty disclaimers, limitation of liability and indemnification are valid for target jurisdictions.
- Paid plans, renewals, taxes, trial terms, price changes and cancellation mechanics match checkout behavior.
- Any arbitration/class-action provisions, if used, are jurisdictionally valid.

### 2. Privacy / Data Protection

Counsel should map actual processing to applicable regimes and confirm:

- Correct legal entity/controller and privacy contact are stated.
- Categories of personal data and purposes are complete and accurate.
- Legal bases are documented where required.
- Data-subject rights and request procedures are complete for target jurisdictions.
- Retention periods/categories are defensible and consistent with implementation.
- Cookies/local storage/analytics and consent requirements are accurately disclosed.
- Vendors/subprocessors, hosting, identity, payments, realtime, storage and media processing are covered.
- International data transfers and required contractual safeguards are addressed.
- Security incident/breach notification obligations are addressed.
- Children's privacy/age-gating requirements are appropriate.
- Deletion/export/account closure behavior matches the notice.
- Any profiling, personalization, recommendations or automated decision-making disclosures are sufficient.

### 3. Payments / Consumer Protection

Counsel should verify that checkout and the refund page cover:

- Seller/merchant-of-record identity.
- Currency, taxes and total price disclosures.
- Subscription renewal cadence and cancellation path.
- Statutory cooling-off/withdrawal rights and digital-service exceptions where applicable.
- Refund timing and original-payment-method rules.
- Chargebacks and payment-provider terms.
- Organizer/event-service cancellation rules.

### 4. Copyright / Content

Counsel should confirm the notice-and-takedown workflow for every target jurisdiction, including:

- Designated copyright-agent/contact details where required.
- Required complaint elements and sworn/attestation language.
- Counter-notice requirements and restoration timing.
- Repeat-infringer policy and enforcement records.
- Game publisher, tournament, music, sponsor and broadcast rights allocation.
- Clip/highlight ownership and licenses.
- User-content moderation and preservation requirements.

### 5. Community / Trust & Safety

Counsel should confirm:

- Prohibited-content categories and enforcement standards are legally appropriate.
- Harassment, threats, privacy/doxxing, fraud and illegal-content escalation paths are adequate.
- Reporting, appeals and moderation records comply with applicable requirements.
- Law-enforcement requests and emergency disclosures have an appropriate process.
- Organizer moderation responsibilities are clearly separated from platform responsibilities.

### 6. Commercial / Organizer agreements

Before onboarding commercial organizers, counsel should review the organizer agreement covering:

- Service scope and SLAs.
- Fees, taxes, payment terms and refunds.
- Broadcast/media rights and event-content ownership.
- Participant/player consent responsibilities.
- Data-processing responsibilities and any DPA.
- Indemnities and insurance requirements.
- Event cancellation, force majeure and outage handling.
- IP/trademark permissions and sponsor assets.
- Liability allocation and dispute resolution.

## Engineering/legal consistency checks

Before counsel signs off, engineering should provide counsel with the actual production configuration for:

1. Authentication and account deletion flows.
2. Payment checkout, subscription renewal and cancellation flows.
3. Analytics/cookie behavior.
4. Data export/deletion behavior.
5. Moderation/report/appeal flows.
6. Copyright report intake and takedown execution.
7. Public profile, player, tournament, clip and stream visibility.
8. Third-party vendor/subprocessor inventory.
9. Security incident response and breach escalation.

## Launch gate

Do **not** represent the legal pages as legally approved until qualified counsel has reviewed the documents against the jurisdictions, business entity, actual data flows, payment model and commercial agreements used by FGC Stream.

Recommended evidence for sign-off:

- Counsel name/firm and jurisdiction(s).
- Review date and document versions reviewed.
- Written approval or redlines.
- List of required engineering/product changes.
- Final approval owner.

## Current known blocker

The repository contains product-level legal templates, but no evidence of external counsel approval is stored in the repository. This file therefore remains **COUNSEL REVIEW REQUIRED** until that evidence is recorded.
