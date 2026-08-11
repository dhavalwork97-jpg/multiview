# Billing launch plan

Billing is intentionally disabled in the current release. Pricing is visible, but paid checkout, subscription management, event payments and the customer billing portal cannot charge customers.

## Current
- 14-day free trial
- Starter: ₹1,499/month — Coming Soon
- Pro: ₹3,999/month — Coming Soon
- Event Package: ₹7,500–₹25,000/event — Coming Soon
- Event payment — Coming Soon
- Subscription management — Coming Soon
- Customer billing portal — Coming Soon

## When ready to sell
1. Create Stripe products/prices.
2. Add Stripe secrets to Vercel.
3. Enable checkout and portal routes.
4. Configure Stripe webhook.
5. Test checkout in Stripe test mode.
6. Switch to live keys only after a complete billing test.

No billing secret is required for the current build.
