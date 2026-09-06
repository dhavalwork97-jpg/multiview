import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl, getStripePriceId } from "@/lib/stripe";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "EVENT"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid billing plan" }, { status: 400 });

  const stripe = (() => {
    try { return getStripe(); } catch { return null; }
  })();
  const priceId = getStripePriceId(parsed.data.plan);
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Billing is not configured for this plan" }, { status: 503 });
  }

  const isEvent = parsed.data.plan === "EVENT";
  const customer = user.stripeCustomerId
    ? await stripe.customers.retrieve(user.stripeCustomerId).catch(() => null)
    : null;
  const customerId = customer && !customer.deleted ? customer.id : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: isEvent ? "payment" : "subscription",
    ...(customerId ? { customer: customerId } : { customer_email: user.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getAppUrl()}/billing?checkout=success`,
    cancel_url: `${getAppUrl()}/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { userId: user.id, plan: parsed.data.plan },
    ...(isEvent ? {} : { subscription_data: { metadata: { userId: user.id, plan: parsed.data.plan } } }),
  });

  return NextResponse.json({ url: session.url });
}
