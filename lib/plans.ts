// Subscription tiers for couples and promotion tiers for vendors.
// Checked on the server (requireFeature) and used by the UI to show upgrade prompts.
import type { ListingTier, Plan, Wedding } from "./types";

export type Feature =
  | "unlimited_events" | "large_guest_list" | "invitation_designer" | "collaborators" | "csv_import"
  | "outfits" | "studio" | "floorplans" | "custom_domain" | "remove_branding" | "sms";

export const PLAN_ORDER: Plan[] = ["free", "plus", "signature"];

export const PLANS: Record<Plan, {
  name: string; price: number; billing: string; tagline: string;
  maxEvents: number; maxGuests: number; highlights: string[];
}> = {
  free: {
    name: "Essentials", price: 0, billing: "free forever",
    tagline: "A beautiful website and RSVPs for smaller celebrations.",
    maxEvents: 2, maxGuests: 150,
    highlights: ["Wedding website with private events", "Up to 2 events", "Up to 150 guests", "Household RSVPs", "Checklist & budget", "Browse & message vendors"],
  },
  plus: {
    name: "Plus", price: 149, billing: "one-time, per wedding",
    tagline: "For multi-day weddings with big families.",
    maxEvents: 8, maxGuests: 1000,
    highlights: ["Everything in Essentials", "Up to 8 events and 1,000 guests", "Invitation designer with QR codes", "Family collaborators & roles", "Outfit manager", "CSV import", "Text invitations & reminders (500 a month)"],
  },
  signature: {
    name: "Signature", price: 349, billing: "one-time, per wedding",
    tagline: "The full planning studio, for every layer of the celebration.",
    maxEvents: Infinity, maxGuests: Infinity,
    highlights: ["Everything in Plus", "Unlimited events and guests", "Design studio: moodboards & floor plans", "Your own domain name", "No Qubool branding on your site", "2,000 texts a month", "Priority support"],
  },
};

const MIN_PLAN: Record<Feature, Plan> = {
  unlimited_events: "signature",
  large_guest_list: "plus",
  invitation_designer: "plus",
  collaborators: "plus",
  csv_import: "plus",
  outfits: "plus",
  studio: "signature",
  floorplans: "signature",
  custom_domain: "signature",
  remove_branding: "signature",
  sms: "plus",
};

export const FEATURE_LABELS: Record<Feature, string> = {
  unlimited_events: "Unlimited events",
  large_guest_list: "Larger guest lists",
  invitation_designer: "The invitation designer",
  collaborators: "Family collaborators",
  csv_import: "CSV import",
  outfits: "The outfit manager",
  studio: "The design studio",
  floorplans: "Floor plans",
  custom_domain: "A custom domain",
  remove_branding: "Removing Qubool branding",
  sms: "Texting guests",
};

/** Texts a wedding may send per 30 days. Only bought plans text (never a free trial): see lib/sms/deliver.ts. */
export const SMS_PER_MONTH: Record<Plan, number> = { free: 0, plus: 500, signature: 2000 };

/** The plan in force today: a running trial unlocks Signature. */
export function effectivePlan(w: Pick<Wedding, "plan" | "trialEndsAt">): Plan {
  if (w.trialEndsAt && new Date(w.trialEndsAt).getTime() > Date.now() && w.plan !== "signature") return "signature";
  return w.plan;
}

export function trialDaysLeft(w: Pick<Wedding, "trialEndsAt" | "plan">) {
  if (!w.trialEndsAt || w.plan === "signature") return 0;
  return Math.max(0, Math.ceil((new Date(w.trialEndsAt).getTime() - Date.now()) / 864e5));
}

export function hasFeature(plan: Plan, f: Feature) {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(MIN_PLAN[f]);
}
export function requiredPlan(f: Feature) {
  return MIN_PLAN[f];
}

export const LISTING_TIERS: Record<ListingTier, { name: string; price: number; perks: string[] }> = {
  basic: { name: "Basic listing", price: 0, perks: ["Profile with photos and contact details", "Appear in search and category pages", "Receive inquiries from couples"] },
  featured: { name: "Featured", price: 10, perks: ["Everything in Basic", "Shown above basic listings in your category", "“Featured” badge", "Monthly views & inquiry stats"] },
  spotlight: { name: "Spotlight", price: 25, perks: ["Everything in Featured", "Homepage & marketplace spotlight carousel", "Recommended inside couples' dashboards", "Top placement for your traditions and cities"] },
};
