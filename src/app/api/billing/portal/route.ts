import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl, getStripe } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!user.stripeCustomerId) return NextResponse.json({ error: "No billing customer exists yet" }, { status: 404 });

  let stripe;
  try { stripe = getStripe(); } catch { return NextResponse.json({ error: "Billing is not configured" }, { status: 503 }); }

  const customer = await stripe.customers.retrieve(user.stripeCustomerId).catch(() => null);
  if (!customer || customer.deleted) return NextResponse.json({ error: "Billing customer not found" }, { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${getAppUrl()}/billing`,
  });
  return NextResponse.json({ url: session.url });
}
