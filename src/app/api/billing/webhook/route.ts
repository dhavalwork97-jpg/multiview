import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, mapStripeStatus } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  let stripe: Stripe;
  try { stripe = getStripe(); } catch { return NextResponse.json({ error: "Billing is not configured" }, { status: 503 }); }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const existing = await db.webhookEvent.findUnique({ where: { source_eventId: { source: "stripe", eventId: event.id } } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });
  await db.webhookEvent.create({ data: { source: "stripe", eventId: event.id } });

  const updateUser = async (customerId: string, subscriptionId: string | null, status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "NONE") => {
    const user = await db.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId, ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}), subscriptionStatus: status },
    });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      if (userId && customerId) {
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId, ...(subscriptionId ? { stripeSubscriptionId: subscriptionId, subscriptionStatus: "ACTIVE" } : {}) },
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      if (customerId) await updateUser(customerId, subscription.id, mapStripeStatus(subscription.status));
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      if (customerId) await updateUser(customerId, subscription.id, "CANCELED");
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (customerId && subscriptionId) await updateUser(customerId, subscriptionId, "PAST_DUE");
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (customerId && subscriptionId) await updateUser(customerId, subscriptionId, "ACTIVE");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
