import Stripe from "stripe";
import { handleStripeEvent } from "@/lib/payments";
import { adminClient } from "@/lib/supabase/server";

/**
 * Stripe webhook: the only way `weddings.plan` and `listings.tier` change outside
 * demo mode. Verifies the signature, records the event id so redeliveries are
 * skipped, and applies it with the service role (lib/payments.ts).
 * Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = adminClient();
  const { error: seen } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (seen?.code === "23505") return Response.json({ received: true, duplicate: true });
  if (seen) return Response.json({ error: "Database unavailable" }, { status: 500 });

  try {
    await handleStripeEvent(admin, event);
  } catch (e) {
    // Forget the event so Stripe's retry gets another go.
    await admin.from("stripe_events").delete().eq("id", event.id);
    console.error(`Stripe webhook ${event.type} ${event.id} failed:`, e);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
  return Response.json({ received: true });
}
