import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Clerk is the source of truth for identity (email, username, avatar);
// this webhook mirrors just enough into our `users` table so that
// Prisma relations (Tournament.organizer, Favorite.user, etc.) work
// with plain foreign keys instead of round-tripping to Clerk on every query.
export async function POST(req: Request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerList = await headers();
  const svixId = headerList.get("svix-id");
  const svixTimestamp = headerList.get("svix-timestamp");
  const svixSignature = headerList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const webhook = new Webhook(signingSecret);

  let event: any;
  try {
    event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  switch (type) {
    case "user.created":
    case "user.updated": {
      const primaryEmail = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      )?.email_address;

      if (!primaryEmail) break;

      await db.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email: primaryEmail,
          username: data.username ?? primaryEmail.split("@")[0],
          displayName: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
          avatarUrl: data.image_url ?? null,
        },
        update: {
          email: primaryEmail,
          username: data.username ?? undefined,
          displayName: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
          avatarUrl: data.image_url ?? null,
        },
      });
      break;
    }
    case "user.deleted": {
      if (data.id) {
        await db.user.deleteMany({ where: { clerkId: data.id } });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
