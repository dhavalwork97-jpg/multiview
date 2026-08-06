import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

// The only writer of User.subscriptionStatus — src/lib/billing.ts's
// isPremium() reads that one field, so every premium-gated feature
// (WebRTC low-latency mode, 9-tile multi-view) stays correct as long as
// this webhook stays correct. Deliberately not trusting the client or
// the checkout success redirect to flip subscription state — Stripe's
// webhook is the only source of truth for "did the payment actually go
// through."
export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.customer && session.subscription) {
        await db.user.updateMany({
          where: { stripeCustomerId: session.customer as string },
          data: {
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: "ACTIVE",
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await db.user.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { subscriptionStatus: mapStripeStatus(sub.status) },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.user.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { subscriptionStatus: "CANCELED", stripeSubscriptionId: null },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
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
