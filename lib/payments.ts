import "server-only";
import type Stripe from "stripe";
import { LISTING_TIERS, PLAN_ORDER, PLANS } from "./plans";
import { paymentsEnabled, stripe, tierOf } from "./stripe";
import type { Supabase } from "./supabase/server";
import type { ListingTier, Plan } from "./types";

// Applying Stripe's results to the database, with the service-role client.
// Called by the webhook, and by the billing pages when a buyer returns from
// Checkout (so the new plan shows even if the webhook is a few seconds behind).
// Every function here is safe to run twice for the same Stripe object.

/** Subscription statuses that keep a listing's paid tier, and those that end it. */
const LIVE = ["active", "trialing", "past_due"];
const ENDED = ["canceled", "unpaid", "incomplete_expired", "paused"];

const id = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : x?.id ?? null);
const iso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);

function must<T extends { error: { message: string } | null }>(r: T): T {
  if (r.error) throw new Error(r.error.message);
  return r;
}

/** A completed Checkout session for a wedding plan: mark it paid and upgrade the wedding. */
export async function fulfillPlanCheckout(admin: Supabase, s: Stripe.Checkout.Session) {
  const weddingId = s.metadata?.wedding_id, plan = s.metadata?.plan as Plan | undefined;
  if (!weddingId || !plan || !(plan in PLANS)) throw new Error(`Checkout ${s.id} has no wedding plan metadata`);
  if (s.payment_status === "unpaid") return false; // a delayed payment method: async_payment_succeeded follows

  // Claim the payment atomically, so the webhook and the return page never both apply it.
  const paid = { status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: id(s.payment_intent) };
  let { data: claimed } = must(await admin.from("payments").update(paid)
    .eq("stripe_checkout_session_id", s.id).neq("status", "paid").select("id"));
  if (!claimed?.length) {
    ({ data: claimed } = must(await admin.from("payments").upsert({
      ...paid, wedding_id: weddingId, plan, amount: s.amount_total ?? 0, currency: s.currency ?? "usd",
      stripe_checkout_session_id: s.id, created_by: s.metadata?.user_id || null,
    }, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }).select("id")));
  }
  if (!claimed?.length) return false; // already applied

  const { data: w } = must(await admin.from("weddings").select("plan").eq("id", weddingId).maybeSingle());
  if (!w) return false;
  // Never downgrade: a late event for a cheaper plan doesn't undo a later upgrade.
  const next = PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(w.plan as Plan) ? plan : (w.plan as Plan);
  must(await admin.from("weddings").update({ plan: next, trial_ends_at: null }).eq("id", weddingId));
  const amount = ((s.amount_total ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: s.currency ?? "usd" });
  must(await admin.from("audit_log").insert({
    wedding_id: weddingId, actor: s.metadata?.actor || "Stripe", action: "plan_change", detail: `Plan → ${PLANS[plan].name} (${amount} paid)`,
  }));
  return true;
}

/** A completed Checkout session for a vendor subscription: record it and switch the listing's tier. */
export async function fulfillTierCheckout(admin: Supabase, s: Stripe.Checkout.Session) {
  const listingId = s.metadata?.listing_id, tier = s.metadata?.tier as ListingTier | undefined;
  if (!listingId || !tier || !(tier in LISTING_TIERS)) throw new Error(`Checkout ${s.id} has no listing tier metadata`);
  if (s.payment_status === "unpaid") return false; // a delayed payment method: async_payment_succeeded follows
  const subId = id(s.subscription);
  const fields = { stripe_subscription_id: subId, stripe_customer_id: id(s.customer), updated_at: new Date().toISOString() };

  // customer.subscription.* may have arrived first and already filled in the row.
  const { data: bySub } = subId ? must(await admin.from("subscriptions").select("id").eq("stripe_subscription_id", subId)) : { data: [] };
  if (bySub?.length) {
    must(await admin.from("subscriptions").delete().eq("stripe_checkout_session_id", s.id).neq("id", bySub[0].id));
    must(await admin.from("subscriptions").update({ stripe_checkout_session_id: s.id }).eq("id", bySub[0].id));
  } else {
    const { data: row } = must(await admin.from("subscriptions").select("id,status").eq("stripe_checkout_session_id", s.id).maybeSingle());
    if (row) {
      must(await admin.from("subscriptions").update({ ...fields, ...(row.status === "pending" || row.status === "expired" ? { status: "active" } : {}) }).eq("id", row.id));
    } else {
      must(await admin.from("subscriptions").insert({
        ...fields, listing_id: listingId, tier, status: "active", amount: s.amount_total, currency: s.currency ?? "usd", stripe_checkout_session_id: s.id,
      }));
    }
  }
  must(await admin.from("listings").update({ tier }).eq("id", listingId));
  return true;
}

/** Mirror a subscription's state; a listing goes back to Basic once it has no live subscription. */
export async function syncSubscription(admin: Supabase, sub: Stripe.Subscription) {
  const listingId = sub.metadata?.listing_id;
  if (!listingId) return; // not one of ours
  const tier = tierOf(sub) ?? "featured";
  const item = sub.items.data[0];
  const fields = {
    listing_id: listingId, tier, status: sub.status, stripe_subscription_id: sub.id, stripe_customer_id: id(sub.customer),
    amount: item?.price?.unit_amount ?? null, currency: item?.price?.currency ?? "usd",
    current_period_end: iso(item?.current_period_end), cancel_at_period_end: sub.cancel_at_period_end || !!sub.cancel_at,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = must(await admin.from("subscriptions").select("id").eq("stripe_subscription_id", sub.id));
  // The listing was deleted with its owner's account (lib/account.ts): keep the record current, unlinked.
  const { data: listing } = must(await admin.from("listings").select("id").eq("id", listingId).maybeSingle());
  if (!listing) {
    const { listing_id: _, ...rest } = fields;
    if (existing?.length) must(await admin.from("subscriptions").update(rest).eq("id", existing[0].id));
    return;
  }
  if (existing?.length) {
    must(await admin.from("subscriptions").update(fields).eq("id", existing[0].id));
  } else {
    // First word about this subscription: adopt the listing's open Checkout row, if any.
    const { data: pending } = must(await admin.from("subscriptions").select("id").eq("listing_id", listingId)
      .is("stripe_subscription_id", null).in("status", ["pending", "expired"]).order("created_at", { ascending: false }).limit(1));
    if (pending?.length) must(await admin.from("subscriptions").update(fields).eq("id", pending[0].id));
    else must(await admin.from("subscriptions").insert(fields));
  }

  if (LIVE.includes(sub.status)) {
    must(await admin.from("listings").update({ tier }).eq("id", listingId));
    return;
  }
  if (!ENDED.includes(sub.status)) return; // incomplete: the first payment is still going through
  const { data: others } = must(await admin.from("subscriptions").select("tier").eq("listing_id", listingId)
    .in("status", LIVE).neq("stripe_subscription_id", sub.id).order("created_at", { ascending: false }).limit(1));
  // A Founding Vendor still inside their free year keeps Featured.
  const { data: l } = must(await admin.from("listings").select("founding_until").eq("id", listingId).maybeSingle());
  const foundingActive = !!l?.founding_until && new Date(l.founding_until).getTime() > Date.now();
  must(await admin.from("listings").update({ tier: (others?.[0]?.tier as ListingTier) ?? (foundingActive ? "featured" : "basic") }).eq("id", listingId));
}

// ---------------------------------------------------------------------------
// Refunds, disputes and early fraud warnings.
// Each event is resolved through Stripe's object graph (charge/dispute →
// PaymentIntent → our payments row, or → invoice → vendor subscription), not
// through metadata.
// ---------------------------------------------------------------------------

/** Our wedding payment for a PaymentIntent, if it paid for a plan. */
async function planPaymentFor(admin: Supabase, paymentIntent: string | null) {
  if (!paymentIntent) return null;
  const { data } = must(await admin.from("payments").select("id,wedding_id,plan,amount,currency,status")
    .eq("stripe_payment_intent_id", paymentIntent).maybeSingle());
  return data;
}

/** The highest plan the wedding still has a 'paid' payment for; Essentials if none. */
async function recomputePlan(admin: Supabase, weddingId: string): Promise<Plan> {
  const { data: paid } = must(await admin.from("payments").select("plan").eq("wedding_id", weddingId).eq("status", "paid"));
  return (paid ?? []).reduce<Plan>((best, p) => (PLAN_ORDER.indexOf(p.plan as Plan) > PLAN_ORDER.indexOf(best) ? (p.plan as Plan) : best), "free");
}

/** Set a plan payment's status, recompute the wedding's plan from what's still paid, and log it. */
async function setPlanPaymentStatus(admin: Supabase, paymentIntent: string | null, status: "paid" | "refunded" | "disputed", detail: string) {
  const pay = await planPaymentFor(admin, paymentIntent);
  if (!pay || pay.status === status) return false;
  must(await admin.from("payments").update({ status }).eq("id", pay.id));
  if (!pay.wedding_id) return true; // the wedding was deleted with its account; the record stays
  const plan = await recomputePlan(admin, pay.wedding_id);
  const { data: w } = must(await admin.from("weddings").select("plan").eq("id", pay.wedding_id).maybeSingle());
  if (w && w.plan !== plan) must(await admin.from("weddings").update({ plan }).eq("id", pay.wedding_id));
  must(await admin.from("audit_log").insert({
    wedding_id: pay.wedding_id, actor: "Stripe", action: "payment_" + status,
    detail: `${detail}${w && w.plan !== plan ? ` Plan → ${PLANS[plan].name}.` : ""}`,
  }));
  return true;
}

const money = (cents: number, currency: string) => (cents / 100).toLocaleString("en-US", { style: "currency", currency });

/** The vendor subscription a PaymentIntent paid an invoice for (needs the API key). */
async function subscriptionFor(paymentIntent: string | null) {
  if (!paymentIntent || !paymentsEnabled()) return null;
  const list = await stripe().invoicePayments.list({ payment: { type: "payment_intent", payment_intent: paymentIntent }, expand: ["data.invoice"], limit: 1 });
  const invoice = list.data[0]?.invoice;
  const sub = invoice && typeof invoice === "object" && "parent" in invoice ? invoice.parent?.subscription_details?.subscription : null;
  return id(sub ?? null);
}

/** A charge was refunded. A full refund of a plan payment takes the plan away. */
async function handleRefund(admin: Supabase, charge: Stripe.Charge) {
  const pi = id(charge.payment_intent);
  const amount = money(charge.amount_refunded, charge.currency);
  if (!charge.refunded) {
    // Partial refund: the couple keeps the plan; just note it.
    const pay = await planPaymentFor(admin, pi);
    if (pay?.wedding_id) must(await admin.from("audit_log").insert({ wedding_id: pay.wedding_id, actor: "Stripe", action: "payment_partial_refund", detail: `Partial refund of ${amount} on the ${PLANS[pay.plan as Plan].name} payment.` }));
    return;
  }
  if (await setPlanPaymentStatus(admin, pi, "refunded", `The ${amount} payment was refunded in full.`)) return;
  // A refunded vendor invoice doesn't end the subscription by itself; that's a decision made in Stripe.
  const sub = await subscriptionFor(pi);
  if (sub) console.warn(`Stripe: vendor subscription ${sub} had a payment of ${amount} refunded.`);
}

/** A payment was disputed (a chargeback). Plans are removed; vendor subscriptions are cancelled. */
async function handleDispute(admin: Supabase, dispute: Stripe.Dispute) {
  const pi = id(dispute.payment_intent);
  const amount = money(dispute.amount, dispute.currency);
  if (await setPlanPaymentStatus(admin, pi, "disputed", `The ${amount} payment was disputed (${dispute.reason.replace(/_/g, " ")}). Respond in the Stripe Dashboard by the evidence deadline.`)) return;
  const sub = await subscriptionFor(pi);
  if (sub) {
    // Stop billing a customer who is disputing; customer.subscription.deleted then returns the listing to Basic.
    await stripe().subscriptions.cancel(sub, { prorate: false, invoice_now: false });
    console.warn(`Stripe: cancelled vendor subscription ${sub} after a ${amount} dispute.`);
  }
}

/** A dispute closed. If we won, the plan payment counts again. */
async function handleDisputeClosed(admin: Supabase, dispute: Stripe.Dispute) {
  if (dispute.status !== "won") return;
  await setPlanPaymentStatus(admin, id(dispute.payment_intent), "paid", `Dispute on the ${money(dispute.amount, dispute.currency)} payment was won; the plan is restored.`);
}

/** Card network flagged a likely-fraudulent charge. Logged for a human to decide (refunding avoids a dispute fee). */
async function handleFraudWarning(admin: Supabase, warning: Stripe.Radar.EarlyFraudWarning) {
  const pi = id(warning.payment_intent ?? null);
  const pay = await planPaymentFor(admin, pi);
  if (pay) {
    must(await admin.from("payments").update({ fraud_warning_at: new Date().toISOString() }).eq("id", pay.id));
    must(await admin.from("audit_log").insert({
      wedding_id: pay.wedding_id, actor: "Stripe", action: "payment_fraud_warning",
      detail: `Early fraud warning (${warning.fraud_type.replace(/_/g, " ")}) on the ${money(pay.amount, pay.currency)} payment. Consider refunding it in Stripe to avoid a dispute.`,
    }));
    return;
  }
  const sub = await subscriptionFor(pi);
  if (sub) console.warn(`Stripe: early fraud warning on vendor subscription ${sub} (${warning.fraud_type}).`);
}

/** Abandoned or failed Checkout: clear the "payment in progress" state. */
async function closeCheckout(admin: Supabase, s: Stripe.Checkout.Session, status: "expired" | "failed") {
  if (s.metadata?.kind === "plan") must(await admin.from("payments").update({ status }).eq("stripe_checkout_session_id", s.id).eq("status", "pending"));
  if (s.metadata?.kind === "tier") must(await admin.from("subscriptions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("stripe_checkout_session_id", s.id).eq("status", "pending"));
}

/** The webhook's dispatcher. Unknown event types are acknowledged and ignored. */
export async function handleStripeEvent(admin: Supabase, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      if (s.metadata?.kind === "plan") await fulfillPlanCheckout(admin, s);
      else if (s.metadata?.kind === "tier") await fulfillTierCheckout(admin, s);
      return;
    }
    case "checkout.session.async_payment_failed":
      return closeCheckout(admin, event.data.object, "failed");
    case "checkout.session.expired":
      return closeCheckout(admin, event.data.object, "expired");
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Events can arrive out of order; with an API key, apply the subscription as it is now.
      const sub = event.data.object;
      return syncSubscription(admin, paymentsEnabled() ? await stripe().subscriptions.retrieve(sub.id) : sub);
    }
    case "charge.refunded":
      return handleRefund(admin, event.data.object);
    case "charge.dispute.created":
      return handleDispute(admin, event.data.object);
    case "charge.dispute.closed":
      return handleDisputeClosed(admin, event.data.object);
    case "radar.early_fraud_warning.created":
      return handleFraudWarning(admin, event.data.object);
  }
}

/**
 * A buyer is back from Checkout (`?session_id=` on the success URL): apply the
 * result now instead of waiting for the webhook. Only for sessions whose
 * metadata matches the signed-in buyer's wedding or listing.
 */
export async function confirmCheckout(admin: Supabase, sessionId: string, owner: { wedding_id: string } | { listing_id: string }) {
  if (!paymentsEnabled() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const s = await stripe().checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!s || s.status !== "complete") return null;
  if ("wedding_id" in owner && s.metadata?.kind === "plan" && s.metadata.wedding_id === owner.wedding_id) {
    await fulfillPlanCheckout(admin, s);
    return s.payment_status === "unpaid" ? null : (s.metadata.plan as Plan);
  }
  if ("listing_id" in owner && s.metadata?.kind === "tier" && s.metadata.listing_id === owner.listing_id) {
    await fulfillTierCheckout(admin, s);
    return s.metadata.tier as ListingTier;
  }
  return null;
}
