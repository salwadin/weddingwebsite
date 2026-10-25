import { expect, test, type APIRequestContext } from "@playwright/test";
import Stripe from "stripe";
import { loadDemoSeed } from "../lib/seed-load";
import { seedUuid } from "../lib/seed";
import { adminClient, DEMO_WEDDING_ID, loginAs, signedIn } from "./helpers";

// The Stripe webhook is the only thing that changes plans and tiers outside demo
// mode. These post signed events the way Stripe does (same secret as the server,
// see playwright.config.ts) and check the database. Re-seeded afterwards.
test.afterAll(async () => { await loadDemoSeed(adminClient()); });

const admin = adminClient();
const LISTING = seedUuid("lst_noor_light");
const secret = process.env.STRIPE_WEBHOOK_SECRET!;
let n = 0;
const uniq = () => `${Date.now()}_${++n}`;

function event(type: string, object: Record<string, unknown>, id = `evt_test_${uniq()}`) {
  return { id, object: "event", type, api_version: Stripe.API_VERSION, created: Math.floor(Date.now() / 1000), livemode: false, data: { object } };
}

async function post(request: APIRequestContext, body: object, signWith = secret) {
  const payload = JSON.stringify(body);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: signWith });
  return request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": header } });
}

const planSession = (plan: string, amount: number) => ({
  id: `cs_test_${uniq()}`, object: "checkout.session", mode: "payment", status: "complete", payment_status: "paid",
  amount_total: amount, currency: "usd", payment_intent: `pi_test_${uniq()}`, customer: null, subscription: null,
  metadata: { kind: "plan", wedding_id: DEMO_WEDDING_ID, plan, from_plan: "free", actor: "Ayesha Siddiqui" },
});

const subscription = (id: string, status: string, tier = "featured", amount = 1000) => ({
  id, object: "subscription", status, customer: "cus_test_noor", cancel_at_period_end: false, cancel_at: null,
  metadata: { kind: "tier", listing_id: LISTING, tier },
  items: { object: "list", data: [{ id: `si_${id}`, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: `price_inline_${tier}`, unit_amount: amount, currency: "usd", product: "prod_test" } }] },
});

test("a paid plan checkout upgrades the wedding exactly once", async ({ request }) => {
  await admin.from("weddings").update({ plan: "free", trial_ends_at: new Date(Date.now() + 5 * 86400e3).toISOString() }).eq("id", DEMO_WEDDING_ID);
  const s = planSession("plus", 8000);
  const e = event("checkout.session.completed", s);

  const res = await post(request, e);
  expect(res.status()).toBe(200);
  const { data: w } = await admin.from("weddings").select("plan,trial_ends_at").eq("id", DEMO_WEDDING_ID).single();
  expect(w).toEqual({ plan: "plus", trial_ends_at: null });
  const { data: pay } = await admin.from("payments").select("plan,amount,status").eq("stripe_checkout_session_id", s.id);
  expect(pay).toEqual([{ plan: "plus", amount: 8000, status: "paid" }]);

  // Stripe redelivers: acknowledged, not applied again.
  const again = await post(request, e);
  expect(await again.json()).toMatchObject({ duplicate: true });
  // Same session under a different event id (e.g. async_payment_succeeded): still applied once.
  expect((await post(request, event("checkout.session.async_payment_succeeded", s))).status()).toBe(200);
  const { data: log } = await admin.from("audit_log").select("detail").eq("wedding_id", DEMO_WEDDING_ID).eq("action", "plan_change");
  expect(log!.filter((l) => l.detail?.includes("$80.00 paid"))).toHaveLength(1);

  // Upgrading to Signature later; a late Plus event can't downgrade it.
  await post(request, event("checkout.session.completed", planSession("signature", 7000)));
  await post(request, event("checkout.session.completed", planSession("plus", 8000)));
  const { data: w2 } = await admin.from("weddings").select("plan").eq("id", DEMO_WEDDING_ID).single();
  expect(w2!.plan).toBe("signature");
});

test("the billing page shows payments to administrators only", async ({ page }) => {
  const { data: rows } = await (await signedIn("ayesha@example.com")).from("payments").select("status").eq("wedding_id", DEMO_WEDDING_ID);
  expect(rows!.length).toBeGreaterThan(0);
  const { data: hidden } = await (await signedIn("nasreen@example.com")).from("payments").select("id").eq("wedding_id", DEMO_WEDDING_ID);
  expect(hidden).toEqual([]);
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/billing");
  await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
  await expect(page.getByText("$80").first()).toBeVisible();
});

test("a vendor subscription sets the tier, and its end returns the listing to Basic", async ({ request }) => {
  const subId = `sub_test_${uniq()}`;
  const s = {
    id: `cs_test_${uniq()}`, object: "checkout.session", mode: "subscription", status: "complete", payment_status: "paid",
    amount_total: 1000, currency: "usd", customer: "cus_test_noor", subscription: subId, metadata: { kind: "tier", listing_id: LISTING, tier: "featured" },
  };
  // A pending row, as changeListingTier leaves it when it opens Checkout.
  await admin.from("subscriptions").insert({ listing_id: LISTING, tier: "featured", status: "pending", amount: 1000, stripe_checkout_session_id: s.id });

  expect((await post(request, event("checkout.session.completed", s))).status()).toBe(200);
  expect((await post(request, event("customer.subscription.created", subscription(subId, "active")))).status()).toBe(200);
  const tier = async () => (await admin.from("listings").select("tier").eq("id", LISTING).single()).data!.tier;
  expect(await tier()).toBe("featured");
  const { data: subs } = await admin.from("subscriptions").select("status,stripe_subscription_id,stripe_customer_id,current_period_end").eq("listing_id", LISTING);
  expect(subs).toHaveLength(1);
  expect(subs![0]).toMatchObject({ status: "active", stripe_subscription_id: subId, stripe_customer_id: "cus_test_noor" });
  expect(subs![0].current_period_end).toBeTruthy();

  // The owner can read it; another vendor or couple can't.
  const { data: own } = await (await signedIn("vendor@example.com")).from("subscriptions").select("tier").eq("listing_id", LISTING);
  expect(own).toEqual([{ tier: "featured" }]);
  const { data: other } = await (await signedIn("ayesha@example.com")).from("subscriptions").select("tier").eq("listing_id", LISTING);
  expect(other).toEqual([]);

  // Switched to Spotlight in the portal, then cancelled.
  await post(request, event("customer.subscription.updated", subscription(subId, "active", "spotlight", 2500)));
  expect(await tier()).toBe("spotlight");
  await post(request, event("customer.subscription.deleted", subscription(subId, "canceled", "spotlight", 2500)));
  expect(await tier()).toBe("basic");
});

const planOf = async () => (await admin.from("weddings").select("plan").eq("id", DEMO_WEDDING_ID).single()).data!.plan;
const statusOf = async (sessionId: string) => (await admin.from("payments").select("status").eq("stripe_checkout_session_id", sessionId).single()).data!.status;
const charge = (pi: string, refunded: boolean, amountRefunded: number) =>
  ({ id: `ch_test_${uniq()}`, object: "charge", amount: 8000, amount_refunded: amountRefunded, refunded, currency: "usd", payment_intent: pi });
const dispute = (pi: string, status: string, amount = 15000) =>
  ({ id: `dp_test_${uniq()}`, object: "dispute", amount, currency: "usd", payment_intent: pi, reason: "fraudulent", status });

test("a full refund takes the plan away; a partial refund doesn't", async ({ request }) => {
  await admin.from("payments").delete().eq("wedding_id", DEMO_WEDDING_ID); // start from no paid plans
  await admin.from("weddings").update({ plan: "free", trial_ends_at: null }).eq("id", DEMO_WEDDING_ID);
  const s = planSession("plus", 8000);
  await post(request, event("checkout.session.completed", s));
  expect(await planOf()).toBe("plus");

  await post(request, event("charge.refunded", charge(s.payment_intent, false, 5000)));
  expect(await planOf()).toBe("plus");
  expect(await statusOf(s.id)).toBe("paid");

  expect((await post(request, event("charge.refunded", charge(s.payment_intent, true, 8000)))).status()).toBe(200);
  expect(await planOf()).toBe("free");
  expect(await statusOf(s.id)).toBe("refunded");
  const { data: log } = await admin.from("audit_log").select("action,detail").eq("wedding_id", DEMO_WEDDING_ID).in("action", ["payment_refunded", "payment_partial_refund"]);
  expect(log!.map((l) => l.action).sort()).toEqual(["payment_partial_refund", "payment_refunded"]);
  expect(log!.find((l) => l.action === "payment_refunded")!.detail).toContain("Plan → Essentials");
});

test("a dispute removes the plan until it's won; fraud warnings are logged", async ({ request }) => {
  await admin.from("payments").delete().eq("wedding_id", DEMO_WEDDING_ID); // start from no paid plans
  await admin.from("weddings").update({ plan: "free", trial_ends_at: null }).eq("id", DEMO_WEDDING_ID);
  const plus = planSession("plus", 8000), sig = planSession("signature", 7000);
  await post(request, event("checkout.session.completed", plus));
  await post(request, event("checkout.session.completed", sig));
  expect(await planOf()).toBe("signature");

  // The Signature upgrade is disputed: the wedding falls back to what's still paid (Plus).
  await post(request, event("charge.dispute.created", dispute(sig.payment_intent, "needs_response", 7000)));
  expect(await planOf()).toBe("plus");
  expect(await statusOf(sig.id)).toBe("disputed");

  // Lost disputes change nothing further; a won dispute restores Signature.
  await post(request, event("charge.dispute.closed", dispute(sig.payment_intent, "lost", 7000)));
  expect(await planOf()).toBe("plus");
  await post(request, event("charge.dispute.closed", dispute(sig.payment_intent, "won", 7000)));
  expect(await planOf()).toBe("signature");
  expect(await statusOf(sig.id)).toBe("paid");

  await post(request, event("radar.early_fraud_warning.created", { id: `issfr_test_${uniq()}`, object: "radar.early_fraud_warning", payment_intent: plus.payment_intent, charge: "ch_x", fraud_type: "card_never_received", actionable: true }));
  const { data: pay } = await admin.from("payments").select("fraud_warning_at,status").eq("stripe_checkout_session_id", plus.id).single();
  expect(pay!.fraud_warning_at).toBeTruthy();
  expect(pay!.status).toBe("paid"); // a warning alone doesn't take the plan away
  const { data: warn } = await admin.from("audit_log").select("detail").eq("wedding_id", DEMO_WEDDING_ID).eq("action", "payment_fraud_warning");
  expect(warn![0].detail).toContain("card never received");
});

test("a vendor checkout that hasn't been paid yet doesn't upgrade the listing", async ({ request }) => {
  await admin.from("listings").update({ tier: "basic" }).eq("id", LISTING);
  const s = {
    id: `cs_test_${uniq()}`, object: "checkout.session", mode: "subscription", status: "complete", payment_status: "unpaid",
    amount_total: 1000, currency: "usd", customer: "cus_test_noor", subscription: `sub_test_${uniq()}`, metadata: { kind: "tier", listing_id: LISTING, tier: "featured" },
  };
  expect((await post(request, event("checkout.session.completed", s))).status()).toBe(200);
  expect((await admin.from("listings").select("tier").eq("id", LISTING).single()).data!.tier).toBe("basic");
});

test("unsigned or wrongly signed webhooks are rejected", async ({ request }) => {
  await admin.from("weddings").update({ plan: "free" }).eq("id", DEMO_WEDDING_ID);
  const forged = await post(request, event("checkout.session.completed", planSession("signature", 15000)), "whsec_not_the_secret");
  expect(forged.status()).toBe(400);
  const unsigned = await request.post("/api/stripe/webhook", { data: event("checkout.session.completed", planSession("signature", 15000)) });
  expect(unsigned.status()).toBe(400);
  const { data: w } = await admin.from("weddings").select("plan").eq("id", DEMO_WEDDING_ID).single();
  expect(w!.plan).toBe("free");
});
