"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { GUEST_COOKIE, grantSiteAccess, guestToken, siteUrl } from "../auth";
import { deliverNow } from "../email/deliver";
import { notifyRsvp } from "../push/send";
import { getSite } from "../site";
import { adminClient, anonClient } from "../supabase/server";
import { deriveToken } from "../tokens";

export type FormState = { ok?: boolean; message?: string; error?: string } | null;

/**
 * Household RSVP. The household comes from the httpOnly invitation cookie, never
 * from the form, and guest_submit_rsvp() re-checks every answer against that
 * household's invitations in the database.
 */
export async function submitHouseholdRsvp(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const site = await getSite(slug);
  if (!site) return { error: "Wedding not found." };
  const token = await guestToken();
  if (!site.guest || !token) return { error: "Your invitation link has expired or was revoked. Please contact the couple." };

  const responses: { eventId: string; guestId: string; status: string; meal?: string }[] = [];
  for (const inv of site.guest.invitations) {
    for (const gid of inv.guestIds) {
      const status = form.get(`status:${inv.eventId}:${gid}`);
      if (status !== "attending" && status !== "declined") continue;
      responses.push({ eventId: inv.eventId, guestId: gid, status, meal: String(form.get(`meal:${inv.eventId}:${gid}`) ?? "") || undefined });
    }
  }
  const plusOnes: Record<string, string> = {};
  for (const g of site.guest.members.filter((m) => m.isPlusOne)) {
    const n = String(form.get(`plusone:${g.id}`) ?? "").trim().slice(0, 80);
    if (n) plusOnes[g.id] = n;
  }
  const dietary = String(form.get("dietary") ?? "").trim().slice(0, 300);

  const { data, error } = await anonClient().rpc("guest_submit_rsvp", { p_token: token, p_responses: responses, p_plus_ones: plusOnes, p_dietary: dietary || null });
  if (error) return { error: "Sorry, we couldn't save your RSVP. Please try again." };
  const r = data as { saved?: number; error?: string; event?: string };
  if (r.error === "invalid") return { error: "Your invitation link has expired or was revoked. Please contact the couple." };
  if (r.error === "deadline") return { error: `The RSVP deadline for the ${r.event} has passed. Please contact the couple to make changes.` };
  if (r.error) return { error: "Please choose attending or not attending for at least one person." };
  const householdId = site.guest.household.id;
  after(() => notifyRsvp(householdId, responses).catch((e) => console.warn(`push: ${(e as Error).message}`)));
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true, message: "Thank you, your RSVP has been saved. You can come back to this page any time before the deadline to make changes." };
}

/** Optional head-count registration for open-invitation (public) events. Capacity and duplicates are handled by public_register(). */
export async function registerPublic(slug: string, eventId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const site = await getSite(slug);
  const e = site?.events.find((x) => x.id === eventId);
  if (!site || site.locked || !e || e.visibility !== "public" || e.rsvpMode === "none") return { error: "This event is not accepting registrations." };

  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const adults = Math.max(1, Math.min(10, Number(form.get("adults") ?? 1) || 1));
  const children = Math.max(0, Math.min(10, Number(form.get("children") ?? 0) || 0));
  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };

  const { data, error } = await anonClient().rpc("public_register", {
    p_event: e.id, p_name: name, p_email: email, p_phone: String(form.get("phone") ?? "").trim().slice(0, 30), p_adults: adults, p_children: children,
  });
  if (error) return { error: "Sorry, we couldn't save your registration. Please try again." };
  const r = data as { status?: string; error?: string };
  revalidatePath(`/w/${slug}`, "layout");
  switch (r.status ?? r.error) {
    case "updated": return { ok: true, message: `We already had a registration for ${email}, so we've updated it rather than adding a duplicate. JazakAllah khair!` };
    case "waitlist": return { ok: true, message: "The event is currently at capacity, so we've added you to the waitlist. We'll email you if a spot opens." };
    case "confirmed": return { ok: true, message: `Thank you! We've noted ${adults + children} ${adults + children === 1 ? "guest" : "guests"} for the ${e.name}. We look forward to seeing you.` };
    case "full": return { error: "We're so sorry, this event has reached capacity." };
    case "closed": return { error: "Registration has closed." };
    case "invalid": return { error: "Please check your name and email address." };
    default: return { error: "This event is not accepting registrations." };
  }
}

const normEmail = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string) => s.replace(/\D/g, "").slice(-10);

/**
 * Guest verification: a guest who lost their link enters their email or phone.
 * We always respond the same way (no account enumeration) and deliver the link
 * only to the contact already on file (by email through Resend; WhatsApp ones wait in Dashboard → Invitations → Outbox).
 *
 * This is the one guest path that uses the service role: matching a contact
 * means reading households, which the anon role can't, and the link itself is
 * derived from a server secret. Nothing it reads is returned to the visitor.
 */
export async function findInvitation(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const contact = String(form.get("contact") ?? "").trim();
  if (contact.length < 5) return { error: "Please enter the email or phone number your invitation was sent to." };
  const done: FormState = { ok: true, message: "If that matches an invitation, we've just sent your personal link to the email or WhatsApp number on file." };

  const admin = adminClient();
  const { data: w } = await admin.from("weddings").select("id,partner1,partner2").eq("slug", slug).eq("published", true).maybeSingle();
  if (!w) return done;
  const byEmail = contact.includes("@");
  if (!byEmail && normPhone(contact).length < 10) return done;
  const { data: candidates } = await admin.from("households").select("id,name,email,phone")
    .eq("wedding_id", w.id).filter(byEmail ? "email" : "phone", "not.is", null).limit(5000);
  const h = (candidates ?? []).find((x) => byEmail ? normEmail(x.email ?? "") === normEmail(contact) : normPhone(x.phone ?? "") === normPhone(contact));
  if (!h) return done;
  const { data: t } = await admin.from("invitation_tokens").select("id").eq("household_id", h.id).is("revoked_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!t) return done;
  await admin.from("outbox").insert({
    wedding_id: w.id, channel: byEmail ? "email" : "whatsapp", recipient: byEmail ? h.email : h.phone, household_id: h.id,
    subject: `Your invitation from ${w.partner1} & ${w.partner2}`,
    body: `Assalamu alaikum ${h.name}, here is your personal invitation link: ${await siteUrl(`/i/${deriveToken(t.id)}`)}`, kind: "verification",
  });
  if (byEmail) await deliverNow({ weddingId: w.id, kind: "verification" });
  await admin.from("audit_log").insert({ wedding_id: w.id, actor: "Guest", action: "link_lookup", detail: `Invitation link re-sent to ${h.name}` });
  return done;
}

export async function unlockSite(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { data: key } = await anonClient().rpc("site_unlock", { p_slug: slug, p_password: String(form.get("password") ?? "") });
  if (!key) return { error: "That password doesn't look right." };
  await grantSiteAccess(slug, key as string);
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true };
}

export async function forgetInvitation(slug: string) {
  (await cookies()).delete(GUEST_COOKIE);
  revalidatePath(`/w/${slug}`, "layout");
}
