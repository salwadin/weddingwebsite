"use server";

import { revalidatePath } from "next/cache";
import { deliverNow } from "../email/deliver";
import { CATEGORIES, TRADITION_LABELS } from "../marketplace";
import { applyFoundingPerks } from "../programs";
import { requireStaff } from "../staff";
import { adminClient } from "../supabase/server";
import type { FormState } from "./site";
import { BETA_EVENTS, BETA_FEATURES } from "../programs-shared";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const urlish = (s: string) => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s);
const validUrl = (s: string) => { try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? u.toString() : ""; } catch { return ""; } };
const list = (f: FormData, k: string, allowed: string[]) => f.getAll(k).map(String).filter((v) => allowed.includes(v));

// ---------------- Public applications ----------------

/** "Become a Founding Vendor" application. Saved for staff review; nothing is published. */
export async function submitVendorApplication(_prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, "company_url")) return { ok: true, message: "Thank you! We'll be in touch." }; // honeypot: bots fill every field
  const business = str(form, "business", 120), contact = str(form, "contact", 100), email = str(form, "email", 200).toLowerCase();
  const category = str(form, "category", 40), city = str(form, "city", 80);
  if (business.length < 2) return { error: "Please add your business name." };
  if (!CATEGORIES.includes(category)) return { error: "Please choose a category." };
  if (city.length < 2) return { error: "Please add the city you're based in." };
  if (contact.length < 2 || !isEmail(email)) return { error: "Please add your name and a valid email." };
  const portfolio = str(form, "portfolio", 2000).split(/\s+|,/).map((s) => validUrl(urlish(s))).filter(Boolean).slice(0, 8);
  const website = validUrl(urlish(str(form, "website", 300)));
  if (!portfolio.length && !website && !str(form, "instagram")) return { error: "Please share at least one link to your work: a website, Instagram, or portfolio." };

  const { error } = await adminClient().from("vendor_applications").insert({
    business_name: business, category, city, region: str(form, "region", 80) || null,
    contact_name: contact, email, phone: str(form, "phone", 40) || null,
    instagram: str(form, "instagram", 100).replace(/^@/, "") || null, website: website || null,
    portfolio_urls: portfolio, traditions: list(form, "traditions", Object.keys(TRADITION_LABELS)),
    about: str(form, "about", 1500) || null,
  });
  if (error?.code === "23505") return { error: "We already have an application from this email. We'll be in touch soon." };
  if (error) { console.error("vendor_applications:", error.message); return { error: "We couldn't save your application. Please try again." }; }
  revalidatePath("/founding-vendors");
  return { ok: true, message: `Thank you, ${contact.split(" ")[0]}! We review applications personally and will email ${email} within a few days.` };
}

/** "Join the Qubool Beta" application, for couples and planners. */
export async function submitBetaApplication(_prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, "company_url")) return { ok: true, message: "Thank you! We'll be in touch." }; // honeypot
  const kind = str(form, "kind") === "planner" ? "planner" : "couple";
  const name = str(form, "name", 100), email = str(form, "email", 200).toLowerCase();
  if (name.length < 2 || !isEmail(email)) return { error: "Please add your name and a valid email." };
  const date = str(form, "event_date", 10);
  const guests = Number(str(form, "guest_count", 7)) || null;
  const perYear = Number(str(form, "weddings_per_year", 4)) || null;

  const { error } = await adminClient().from("beta_applications").insert({
    kind, name, email, phone: str(form, "phone", 40) || null,
    partner_name: kind === "couple" ? str(form, "partner_name", 100) || null : null,
    company: kind === "planner" ? str(form, "company", 120) || null : null,
    city: str(form, "city", 80) || null,
    event_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    guest_count: guests && guests > 0 && guests <= 100000 ? Math.round(guests) : null,
    events: list(form, "events", BETA_EVENTS), traditions: list(form, "traditions", Object.keys(TRADITION_LABELS)),
    features: list(form, "features", BETA_FEATURES),
    weddings_per_year: kind === "planner" && perYear && perYear > 0 ? Math.min(1000, Math.round(perYear)) : null,
    heard_from: str(form, "heard_from", 120) || null, notes: str(form, "notes", 1500) || null,
  });
  if (error?.code === "23505") return { error: "You're already on the list with this email. We'll be in touch soon." };
  if (error) { console.error("beta_applications:", error.message); return { error: "We couldn't save your application. Please try again." }; }
  return { ok: true, message: `You're on the list, ${name.split(" ")[0]}! We're inviting people in small groups and will email ${email} when it's your turn.` };
}

// ---------------- Staff review (/admin) ----------------

async function queueEmail(kind: "founding_approved" | "beta_invite", to: string, subject: string) {
  // wedding_id is null: only the server can write such rows; the email body comes from a fixed template.
  const { error } = await adminClient().from("outbox").insert({ wedding_id: null, channel: "email", recipient: to, subject, body: "", kind });
  if (error) console.error("outbox:", error.message);
  await deliverNow({ kind });
}

/** `decision` is bound per button (approve / waitlist / decline / reopen / notes). */
export async function reviewVendorApplication(decision: string, form: FormData) {
  const staff = await requireStaff();
  const id = str(form, "id", 40), notes = str(form, "staff_notes", 2000);
  const admin = adminClient();
  const { data: app } = await admin.from("vendor_applications").select("email,business_name,status").eq("id", id).maybeSingle();
  if (!app) return;
  if (form.has("staff_notes")) await admin.from("vendor_applications").update({ staff_notes: notes || null }).eq("id", id);

  if (decision === "approve" && app.status !== "approved") {
    const { data: n, error } = await admin.rpc("approve_vendor_application", { p_id: id, p_reviewer: staff.email });
    if (error) throw new Error(error.message);
    await applyFoundingPerks(app.email as string);
    await queueEmail("founding_approved", app.email as string,
      typeof n === "number" ? `Welcome to the Founding 50 · Vendor #${n}` : `You're approved to list ${app.business_name} on Qubool`);
  } else if (decision === "waitlist" || decision === "decline") {
    await admin.from("vendor_applications").update({ status: decision === "waitlist" ? "waitlisted" : "declined", reviewed_by: staff.email, reviewed_at: new Date().toISOString() }).eq("id", id);
  } else if (decision === "reopen") {
    await admin.from("vendor_applications").update({ status: "pending" }).eq("id", id).neq("status", "approved");
  }
  revalidatePath("/admin");
  revalidatePath("/founding-vendors");
}

/** `decision` is bound per button (invite / decline / reopen / notes). */
export async function reviewBetaApplication(decision: string, form: FormData) {
  const staff = await requireStaff();
  const id = str(form, "id", 40), notes = str(form, "staff_notes", 2000);
  const admin = adminClient();
  const { data: app } = await admin.from("beta_applications").select("email,status").eq("id", id).maybeSingle();
  if (!app) return;
  if (form.has("staff_notes")) await admin.from("beta_applications").update({ staff_notes: notes || null }).eq("id", id);

  if (decision === "invite" && app.status !== "joined") {
    await admin.from("beta_applications").update({ status: "invited", invited_at: new Date().toISOString(), reviewed_by: staff.email }).eq("id", id);
    await queueEmail("beta_invite", app.email as string, "You're invited to the Qubool beta");
  } else if (decision === "decline") {
    await admin.from("beta_applications").update({ status: "declined", reviewed_by: staff.email }).eq("id", id);
  } else if (decision === "reopen") {
    await admin.from("beta_applications").update({ status: "new" }).eq("id", id).neq("status", "joined");
  }
  revalidatePath("/admin");
}
