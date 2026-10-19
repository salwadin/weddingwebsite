"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, organizerContext, startOrganizerSession } from "../auth";
import { can, scopeFor } from "../access";
import { audit, db, mutate, uid } from "../db";
import { hashPassword } from "../seed";
import type { Inquiry, Listing, ListingTier } from "../types";
import type { FormState } from "./site";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

/** Couples (or anyone) contacting a vendor. Free for couples: vendors pay for promotion. */
export async function sendInquiry(listingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const l = db().listings.find((x) => x.id === listingId && x.published);
  if (!l) return { error: "This vendor isn't available." };
  const name = str(form, "name", 100), email = str(form, "email", 200).toLowerCase(), message = str(form, "message", 2000);
  if (name.length < 2 || !isEmail(email)) return { error: "Please add your name and a valid email." };
  if (message.length < 10) return { error: "Please tell the vendor a little about your wedding." };
  const org = await organizerContext();
  const recent = db().inquiries.filter((q) => q.listingId === l.id && q.fromEmail === email && Date.now() - Date.parse(q.createdAt) < 864e5);
  if (recent.length >= 3) return { error: "You've already contacted this vendor today. They'll be in touch soon." };
  mutate((d) => {
    d.inquiries.unshift({
      id: uid("inq"), listingId: l.id, weddingId: org?.wedding.id, fromName: name, fromEmail: email,
      eventDate: str(form, "eventDate", 10) || undefined, guests: Number(form.get("guests")) || undefined,
      message, status: "new", createdAt: new Date().toISOString(),
    });
    d.outbox.unshift({ id: uid("msg"), weddingId: org?.wedding.id ?? "marketplace", channel: "email", to: l.email, subject: `New inquiry from ${name}`, body: message.slice(0, 300), kind: "invitation", createdAt: new Date().toISOString() });
  });
  return { ok: true, message: `Sent! ${l.name} usually replies within a couple of days, to ${email}.` };
}

/** Add a marketplace listing to the couple's own vendor tracker. */
export async function saveToMyVendors(form: FormData) {
  const org = await organizerContext();
  if (!org) redirect("/login");
  if (!can(scopeFor(org.collaborator.role, org.collaborator.eventIds), "vendors", "edit")) throw new Error("Not permitted");
  const l = db().listings.find((x) => x.id === str(form, "listingId") && x.published);
  if (!l) throw new Error("Unknown vendor");
  mutate((d) => {
    if (d.vendors.some((v) => v.weddingId === org.wedding.id && v.listingId === l.id)) return;
    d.vendors.push({ id: uid("ven"), weddingId: org.wedding.id, category: l.category, name: l.name, contact: "", email: l.email, phone: l.phone, eventIds: [], status: "researching", listingId: l.id });
    audit(d, org.wedding.id, org.user.name, "vendor_saved", l.name);
  });
  revalidatePath("/dashboard/vendors");
  revalidatePath(`/marketplace/${l.id}`);
}

// ---------------- Vendor accounts ----------------

export async function vendorSignup(_prev: FormState, form: FormData): Promise<FormState> {
  const business = str(form, "business", 100), name = str(form, "name", 80);
  const email = str(form, "email", 200).toLowerCase(), password = String(form.get("password") ?? "");
  if (business.length < 2 || name.length < 2) return { error: "Please add your name and business name." };
  if (!isEmail(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
  if (db().users.some((u) => u.email === email)) return { error: "An account with this email already exists. Try signing in." };
  const userId = uid("usr");
  mutate((d) => {
    d.users.push({ id: userId, email, name, kind: "vendor", passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
    d.listings.push({
      id: uid("lst"), ownerUserId: userId, name: business, category: str(form, "category", 40) || "Other", city: str(form, "city", 60),
      serves: [], tagline: "", description: "", images: [], priceRange: 2, tags: [], traditions: [], email, tier: "basic",
      rating: 0, reviewCount: 0, published: false, views: 0, createdAt: new Date().toISOString(),
    });
  });
  await startOrganizerSession(userId);
  redirect("/vendor?welcome=1");
}

async function myListing() {
  const user = await currentUser();
  if (!user || user.kind !== "vendor") redirect("/login");
  const l = db().listings.find((x) => x.ownerUserId === user.id);
  if (!l) redirect("/for-vendors");
  return { user, l };
}

export async function updateListing(form: FormData) {
  const { l } = await myListing();
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
  mutate((d) => { Object.assign(d.listings.find((x) => x.id === l.id)!, patch); });
  revalidatePath("/vendor"); revalidatePath("/marketplace", "layout");
  redirect("/vendor?saved=1#listing");
}

export async function setInquiryStatus(form: FormData) {
  const { l } = await myListing();
  const status = str(form, "status") as Inquiry["status"];
  if (!["new", "replied", "booked", "closed"].includes(status)) return;
  mutate((d) => {
    const q = d.inquiries.find((x) => x.id === str(form, "id") && x.listingId === l.id);
    if (q) q.status = status;
  });
  revalidatePath("/vendor");
}

/** Demo only: switches the promotion tier without charging. A real build would go through Stripe Checkout. */
export async function changeListingTier(form: FormData) {
  const { l } = await myListing();
  const tier = str(form, "tier") as ListingTier;
  if (!["basic", "featured", "spotlight"].includes(tier)) return;
  mutate((d) => { d.listings.find((x) => x.id === l.id)!.tier = tier; });
  revalidatePath("/vendor"); revalidatePath("/marketplace", "layout");
  redirect(`/vendor?tier=${tier}#promote`);
}

export async function recordView(listingId: string) {
  mutate((d) => { const l = d.listings.find((x) => x.id === listingId); if (l) l.views++; });
}
