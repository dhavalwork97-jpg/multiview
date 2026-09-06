# Billing launch plan

V31.27 adds the production billing integration while keeping charging dependent on explicit Stripe configuration. Without Stripe secrets and price IDs, the billing endpoints remain unavailable and no customer can be charged.

## Commercial plans
- 14-day free trial
- Starter: ₹1,499/month
- Pro: ₹3,999/month
- Event Package: ₹7,500–₹25,000/event

## Implemented
- Stripe Checkout for Starter and Pro subscriptions.
- Stripe Checkout for the one-time Event Package.
- Stripe Customer Portal for subscription management.
- Signed, idempotent Stripe webhook processing.
- Subscription state synchronization to the application user.
- Payment failures move subscriptions to `PAST_DUE`; cancellation moves them to `CANCELED`.
- Checkout metadata links Stripe sessions/subscriptions to the authenticated FGC user.

## Required production configuration
Set these server-side environment variables before enabling paid sales:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_STARTER_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_EVENT_PRICE_ID`
- `NEXT_PUBLIC_APP_URL`

Configure the Stripe webhook endpoint at `/api/billing/webhook` for checkout completion, subscription lifecycle, and invoice payment events. Keep webhook signing enabled.

## Launch procedure
1. Create the three Stripe products/prices with the published INR amounts.
2. Add the production secrets to the deployment environment.
3. Configure the Stripe webhook and verify its signing secret.
4. Run complete checkout, portal, renewal, failed-payment, and cancellation tests in Stripe test mode.
5. Confirm the corresponding user subscription state and access limits update correctly.
6. Switch to live Stripe keys only after the complete billing test passes.

No billing secret is required for local builds that do not exercise paid billing; missing configuration returns a controlled `503` instead of crashing the application.
