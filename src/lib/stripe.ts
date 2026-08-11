import Stripe from "stripe";

/**
 * Create Stripe lazily at request time rather than module-load time.
 * This keeps `next build` from crashing when STRIPE_SECRET_KEY is not
 * present in the local build environment. Production requests still fail
 * clearly if the secret is actually missing.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-11-20.acacia",
  });
}

export function mapStripeStatus(status: Stripe.Subscription.Status): "ACTIVE" | "PAST_DUE" | "CANCELED" | "NONE" {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "NONE";
  }
}
