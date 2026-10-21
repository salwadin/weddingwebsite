"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, organizerContext, siteUrl } from "../auth";
import { audit, mutate, uid } from "../db";
import { deliverNow } from "../email/deliver";
import { requireOrg } from "../dashboard";
import { syncSubscription } from "../payments";
import { LISTING_TIERS } from "../plans";
import { fromRow, type Row } from "../rows";
import { checkoutExpiry, paymentsEnabled, stripe, tierItemPrice, tierLineItem, CHECKOUT_LABEL } from "../stripe";
import { demoEnabled } from "../supabase/env";
import { adminClient, anonClient, serverClient } from "../supabase/server";
import type { Inquiry, Listing, ListingTier } from "../types";
import type { FormState } from "./site";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

/** Couples (or anyone) contacting a vendor. Free for couples: vendors pay for promotion. Rate-limited in send_inquiry(). */
export async function sendInquiry(listingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const name = str(form, "name", 100), email = str(form, "email", 200).toLowerCase(), message = str(form, "message", 2000);
  if (name.length < 2 || !isEmail(email)) return { error: "Please add your name and a valid email." };
  if (message.length < 10) return { error: "Please tell the vendor a little about your wedding." };
  const org = await organizerContext();
  const sb = org ? await serverClient() : anonClient(); // signed in: the inquiry is linked to their wedding
  const { data, error } = await sb.rpc("send_inquiry", {
    p_listing: listingId, p_name: name, p_email: email, p_event_date: str(form, "eventDate", 10) || null,
    p_guests: Number(form.get("guests")) || null, p_message: message, p_wedding: org?.wedding.id ?? null,
  });
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  if (error || r.error === "unavailable") return { error: "This vendor isn't available." };
  if (r.error === "limit") return { error: "You've already contacted this vendor today. They'll be in touch soon." };
  if (r.error) return { error: "Please check your details and try again." };
  await deliverNow({ kind: "inquiry" });
  const { data: l } = await anonClient().from("listings").select("name").eq("id", listingId).maybeSingle();
  return { ok: true, message: `Sent! ${l?.name ?? "The vendor"} usually replies within a couple of days, to ${email}.` };
}

/** Add a marketplace listing to the couple's own vendor tracker. */
export async function saveToMyVendors(form: FormData) {
  if (!(await organizerContext())) redirect("/login");
  const o = await requireOrg("vendors", "edit");
  const { data } = await o.sb.from("listings").select("*").eq("id", str(form, "listingId")).eq("published", true).maybeSingle();
  if (!data) throw new Error("Unknown vendor");
  const l = fromRow("listings", data as Row);
  await mutate(o, (d) => {
    if (d.vendors.some((v) => v.weddingId === o.ctx.wedding.id && v.listingId === l.id)) return;
    d.vendors.push({ id: uid("ven"), weddingId: o.ctx.wedding.id, category: l.category, name: l.name, contact: "", email: l.email, phone: l.phone, eventIds: [], status: "researching", listingId: l.id });
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "vendor_saved", l.name);
  });
  revalidatePath("/dashboard/vendors");
  revalidatePath(`/marketplace/${l.id}`);
}

// ---------------- Vendor accounts ----------------

/** Vendor sign-up. The unpublished listing is created with the account (handle_new_user()). */
export async function vendorSignup(_prev: FormState, form: FormData): Promise<FormState> {
  const business = str(form, "business", 100), name = str(form, "name", 80);
  const email = str(form, "email", 200).toLowerCase(), password = String(form.get("password") ?? "");
  if (business.length < 2 || name.length < 2) return { error: "Please add your name and business name." };
  if (!isEmail(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
  const sb = await serverClient();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: {
      data: { name, kind: "vendor", business, category: str(form, "category", 40) || "Other", city: str(form, "city", 60) },
      emailRedirectTo: await siteUrl("/auth/confirm?next=/vendor?welcome=1"),
    },
  });
  if (error) return { error: error.code === "weak_password" ? "Please choose a stronger password." : "We couldn't create that account. Please try again." };
  if (data.session) redirect("/vendor?welcome=1");
  return { ok: true, message: `We've sent a confirmation link to ${email}. Open it to finish setting up ${business}.` };
}

async function myListing() {
  const user = await currentUser();
  if (!user || user.kind !== "vendor") redirect("/login");
  const sb = await serverClient();
  const { data } = await sb.from("listings").select("*").eq("owner_user_id", user.id).limit(1).maybeSingle();
  if (!data) redirect("/for-vendors");
  return { user, sb, l: fromRow("listings", data as Row) };
}

export async function updateListing(form: FormData) {
  const { sb, l } = await myListing();
  const list = (k: string) => str(form, k, 2000).split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const patch: Partial<Listing> = {
    name: str(form, "name", 100) || l.name, category: str(form, "category", 40) || l.category, city: str(form, "city", 60),
    serves: list("serves").slice(0, 10), tagline: str(form, "tagline", 160), description: str(form, "description", 3000),
    images: list("images").filter((u) => /^https:\/\//.test(u)).slice(0, 12),
    priceRange: Math.min(4, Math.max(1, Number(form.get("priceRange")) || 2)) as Listing["priceRange"],
    tags: form.getAll("tags").map(String).slice(0, 12), traditions: form.getAll("traditions").map(String).slice(0, 10),
    phone: str(form, "phone", 40) || undefined, website: /^https?:\/\//.test(str(form, "website", 300)) ? str(form, "website", 300) : undefined,
    published: form.get("published") === "on",
  };
  const { error } = await sb.from("listings").update({
    name: patch.name, category: patch.category, city: patch.city, serves: patch.serves, tagline: patch.tagline, description: patch.description,
    images: patch.images, price_range: patch.priceRange, tags: patch.tags, traditions: patch.traditions,
    phone: patch.phone ?? null, website: patch.website ?? null, published: patch.published,
  }).eq("id", l.id);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor"); revalidatePath("/marketplace", "layout");
  redirect("/vendor?saved=1#listing");
}

export async function setInquiryStatus(form: FormData) {
  const { sb, l } = await myListing();
  const status = str(form, "status") as Inquiry["status"];
  if (!["new", "replied", "booked", "closed"].includes(status)) return;
  const { error } = await sb.from("inquiries").update({ status }).eq("id", str(form, "id")).eq("listing_id", l.id);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

/**
 * Change the listing's promotion tier. Outside demo mode a paid tier is a monthly
 * Stripe subscription: new subscribers go through Checkout, existing ones switch
 * price in place, and cancelling happens in the Stripe customer portal. The
 * webhook (or the returned subscription) sets `tier`; vendors can't (column grant).
 *
 * Demo (QUBOOL_DEMO=on): switches the tier immediately without charging.
 */
export async function changeListingTier(form: FormData) {
  const { user, sb, l } = await myListing();
  const tier = str(form, "tier") as ListingTier;
  if (!["basic", "featured", "spotlight"].includes(tier)) return;
  if (demoEnabled()) {
    const { error } = await adminClient().from("listings").update({ tier }).eq("id", l.id);
    if (error) throw new Error(error.message);
    revalidatePath("/vendor"); revalidatePath("/marketplace", "layout");
    redirect(`/vendor?tier=${tier}#promote`);
  }
  if (!paymentsEnabled()) throw new Error("Online payments aren't available yet.");
  if (tier === "basic") return openBillingPortal();

  const { data: subs } = await sb.from("subscriptions").select("status,stripe_subscription_id,stripe_customer_id")
    .eq("listing_id", l.id).order("created_at", { ascending: false });
  const live = subs?.find((x) => x.stripe_subscription_id && ["active", "trialing", "past_due"].includes(x.status));
  if (live) {
    // Already subscribed: change the price on the existing subscription (prorated).
    const current = await stripe().subscriptions.retrieve(live.stripe_subscription_id!);
    const item = current.items.data[0];
    const product = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
    const updated = await stripe().subscriptions.update(current.id, {
      items: [{ id: item.id, ...tierItemPrice(tier, product) }],
      metadata: { ...current.metadata, tier },
      cancel_at_period_end: false,
    });
    await syncSubscription(adminClient(), updated);
    revalidatePath("/vendor"); revalidatePath("/marketplace", "layout");
    redirect(`/vendor?tier=${tier}#promote`);
  }

  const meta = { kind: "tier", listing_id: l.id, tier, user_id: user.id };
  const customer = subs?.find((x) => x.stripe_customer_id)?.stripe_customer_id ?? undefined;
  const session = await stripe().checkout.sessions.create({
    integration_identifier: CHECKOUT_LABEL.tier,
    mode: "subscription",
    line_items: [tierLineItem(tier)],
    ...(customer ? { customer } : { customer_email: user.email || undefined }),
    client_reference_id: l.id,
    metadata: meta,
    subscription_data: { metadata: meta, description: `${LISTING_TIERS[tier].name}: ${l.name}` },
    success_url: (await siteUrl("/vendor?checkout=success")) + "&session_id={CHECKOUT_SESSION_ID}#promote",
    cancel_url: await siteUrl("/vendor?checkout=cancelled#promote"),
    expires_at: checkoutExpiry(),
  });
  const { error } = await adminClient().from("subscriptions").insert({
    listing_id: l.id, tier, status: "pending", amount: LISTING_TIERS[tier].price * 100, stripe_checkout_session_id: session.id, stripe_customer_id: customer ?? null,
  });
  if (error) throw new Error(error.message);
  redirect(session.url!);
}

/** Stripe's customer portal: card details, invoices, and cancelling the subscription. */
export async function openBillingPortal() {
  const { sb, l } = await myListing();
  if (!paymentsEnabled()) throw new Error("Online payments aren't available yet.");
  const { data } = await sb.from("subscriptions").select("stripe_customer_id").eq("listing_id", l.id)
    .not("stripe_customer_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.stripe_customer_id) redirect("/vendor#promote");
  const portal = await stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: await siteUrl("/vendor#promote") });
  redirect(portal.url);
}

export async function recordView(listingId: string) {
  await anonClient().rpc("record_listing_view", { p_listing: listingId });
}
