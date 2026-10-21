import "server-only";
import Stripe from "stripe";
import { LISTING_TIERS, PLANS } from "./plans";
import type { ListingTier, Plan } from "./types";

// Stripe settings. Payments are live when STRIPE_SECRET_KEY is set; price ids
// are optional (without them Checkout uses inline prices from lib/plans.ts).

/** Online payments are configured. (Demo mode still switches plans instantly.) */
export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | undefined;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return (client ??= new Stripe(key));
}

const PLAN_PRICE: Record<Exclude<Plan, "free">, string | undefined> = {
  plus: process.env.STRIPE_PRICE_PLUS, signature: process.env.STRIPE_PRICE_SIGNATURE,
};
const TIER_PRICE: Record<Exclude<ListingTier, "basic">, string | undefined> = {
  featured: process.env.STRIPE_PRICE_FEATURED, spotlight: process.env.STRIPE_PRICE_SPOTLIGHT,
};

/** What upgrading a wedding costs, in dollars: the difference when it already has a paid plan. */
export function upgradePrice(target: Plan, current: Plan) {
  return PLANS[target].price - PLANS[current].price;
}

/** The Checkout line item for buying `target` when the wedding is on `current`. */
export function planLineItem(target: Exclude<Plan, "free">, current: Plan): Stripe.Checkout.SessionCreateParams.LineItem {
  const price = PLAN_PRICE[target];
  if (current === "free" && price) return { price, quantity: 1 };
  return {
    quantity: 1,
    price_data: {
      currency: "usd", unit_amount: upgradePrice(target, current) * 100,
      product_data: {
        name: current === "free" ? `Qubool ${PLANS[target].name}` : `Qubool ${PLANS[target].name} (upgrade from ${PLANS[current].name})`,
        description: PLANS[target].tagline,
      },
    },
  };
}

/** The Checkout line item for a monthly promotion tier. */
export function tierLineItem(tier: Exclude<ListingTier, "basic">): Stripe.Checkout.SessionCreateParams.LineItem {
  const price = TIER_PRICE[tier];
  if (price) return { price, quantity: 1 };
  return {
    quantity: 1,
    price_data: {
      currency: "usd", unit_amount: LISTING_TIERS[tier].price * 100, recurring: { interval: "month" },
      product_data: { name: `Qubool ${LISTING_TIERS[tier].name} listing` },
    },
  };
}

/** The price to switch an existing subscription item to. Inline prices reuse the item's product. */
export function tierItemPrice(tier: Exclude<ListingTier, "basic">, product: string): Pick<Stripe.SubscriptionUpdateParams.Item, "price" | "price_data"> {
  const price = TIER_PRICE[tier];
  if (price) return { price };
  return { price_data: { currency: "usd", unit_amount: LISTING_TIERS[tier].price * 100, recurring: { interval: "month" }, product } };
}

/** Which tier a subscription pays for: its price id, else our metadata, else the amount. */
export function tierOf(sub: Stripe.Subscription): ListingTier | undefined {
  const price = sub.items.data[0]?.price;
  const byId = (Object.keys(TIER_PRICE) as (keyof typeof TIER_PRICE)[]).find((t) => TIER_PRICE[t] && TIER_PRICE[t] === price?.id);
  if (byId) return byId;
  const meta = sub.metadata?.tier as ListingTier | undefined;
  if (meta && meta in LISTING_TIERS) return meta;
  return (Object.keys(LISTING_TIERS) as ListingTier[]).find((t) => t !== "basic" && LISTING_TIERS[t].price * 100 === price?.unit_amount);
}

/**
 * Labels that tag each Checkout flow in the Stripe Dashboard (integration_identifier),
 * so plan purchases and vendor promotions can be tracked and compared separately.
 */
export const CHECKOUT_LABEL = { plan: "qubool-wedding-plan-vlsjfbhh", tier: "qubool-vendor-tier-hawrebgg" } as const;

/** Checkout sessions expire after an hour, so a "payment in progress" notice doesn't linger. */
export const checkoutExpiry = () => Math.floor(Date.now() / 1000) + 60 * 60;
