"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { audit, db, mutate, uid } from "../db";
import { GUEST_COOKIE, grantSiteAccess, guestHousehold } from "../auth";
import { findVisibleEvent, rsvpEligibility } from "../access";
import { findWedding } from "../site";
import type { RsvpStatus } from "../types";

export type FormState = { ok?: boolean; message?: string; error?: string } | null;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Household RSVP. Every field is re-validated against the server-side invitation:
 * the household comes from the httpOnly cookie, never from the form.
 */
export async function submitHouseholdRsvp(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const w = findWedding(slug);
  if (!w) return { error: "Wedding not found." };
  const household = await guestHousehold(w.id);
  if (!household) return { error: "Your invitation link has expired or was revoked. Please contact the couple." };

  const d = db();
  const invitations = d.invitations.filter((i) => i.householdId === household.id);
  const changes: { eventId: string; guestId: string; status: RsvpStatus; meal?: string }[] = [];
  const plusOneNames: Record<string, string> = {};

  for (const inv of invitations) {
    const e = findVisibleEvent(w.id, inv.eventId, household);
    if (!e || e.rsvpMode === "none") continue;
    for (const gid of inv.guestIds) {
      const status = form.get(`status:${e.id}:${gid}`);
      if (status !== "attending" && status !== "declined") continue;
      if (e.rsvpDeadline && today() > e.rsvpDeadline) return { error: `The RSVP deadline for the ${e.name} has passed. Please contact the couple to make changes.` };
      const meal = String(form.get(`meal:${e.id}:${gid}`) ?? "");
      changes.push({
        eventId: e.id, guestId: gid, status,
        meal: status === "attending" && e.mealOptions.includes(meal) ? meal : undefined,
      });
    }
  }
  for (const g of d.guests.filter((x) => x.householdId === household.id && x.isPlusOne)) {
    const n = String(form.get(`plusone:${g.id}`) ?? "").trim().slice(0, 80);
    if (n) plusOneNames[g.id] = n;
  }
  const dietaryNote = String(form.get("dietary") ?? "").trim().slice(0, 300);

  if (!changes.length) return { error: "Please choose attending or not attending for at least one person." };

  mutate((d) => {
    const now = new Date().toISOString();
    for (const c of changes) {
      const existing = d.rsvps.find((r) => r.eventId === c.eventId && r.guestId === c.guestId);
      if (existing) Object.assign(existing, { status: c.status, meal: c.meal, updatedAt: now, updatedVia: "guest_link" });
      else d.rsvps.push({ id: uid("rsvp"), householdId: household.id, ...c, updatedAt: now, updatedVia: "guest_link" });
    }
    for (const [gid, name] of Object.entries(plusOneNames)) {
      const g = d.guests.find((x) => x.id === gid && x.householdId === household.id);
      if (g) { const [first, ...rest] = name.split(" "); g.firstName = first; g.lastName = rest.join(" "); }
    }
    if (dietaryNote) {
      const h = d.households.find((x) => x.id === household.id);
      if (h) h.notes = [h.notes, `Dietary (from RSVP): ${dietaryNote}`].filter(Boolean).join("\n");
    }
    const summary = [...new Set(changes.map((c) => c.eventId))].map((eid) => {
      const ev = d.events.find((e) => e.id === eid)!;
      const yes = changes.filter((c) => c.eventId === eid && c.status === "attending").length;
      return `${ev.name}: ${yes}/${changes.filter((c) => c.eventId === eid).length} attending`;
    }).join(", ");
    audit(d, w.id, household.name, "rsvp", summary);
  });
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true, message: "Thank you, your RSVP has been saved. You can come back to this page any time before the deadline to make changes." };
}

const normEmail = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string) => s.replace(/\D/g, "").slice(-10);
const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Optional head-count registration for open-invitation (public) events. */
export async function registerPublic(slug: string, eventId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const w = findWedding(slug);
  if (!w) return { error: "Wedding not found." };
  const household = await guestHousehold(w.id);
  const e = findVisibleEvent(w.id, eventId, household);
  if (!e || rsvpEligibility(e, null).kind !== "public") return { error: "This event is not accepting registrations." };
  if (e.rsvpDeadline && today() > e.rsvpDeadline) return { error: "Registration has closed." };

  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const email = normEmail(String(form.get("email") ?? "")).slice(0, 200);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 30);
  const adults = Math.max(1, Math.min(10, Number(form.get("adults") ?? 1) || 1));
  const children = Math.max(0, Math.min(10, Number(form.get("children") ?? 0) || 0));
  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };

  return mutate((d) => {
    const regs = d.registrations.filter((r) => r.eventId === e.id && r.status !== "cancelled");
    // Duplicate detection: same email or phone updates the existing registration instead of double-counting.
    const dup = regs.find((r) => normEmail(r.email) === email || (phone && r.phone && normPhone(r.phone) === normPhone(phone)));
    if (dup) {
      Object.assign(dup, { name, adults, children, phone: phone || dup.phone });
      audit(d, w.id, name, "public_rsvp_update", `${e.name}: updated existing registration (${adults} adults, ${children} children)`);
      return { ok: true, message: `We already had a registration for ${email}, so we've updated it rather than adding a duplicate. JazakAllah khair!` };
    }
    const nameDup = regs.find((r) => normName(r.name) === normName(name));
    const used = regs.filter((r) => r.status === "confirmed").reduce((n, r) => n + r.adults + r.children, 0);
    const full = !!e.capacity && used + adults + children > e.capacity;
    if (full && !e.waitlist) return { error: "We're so sorry, this event has reached capacity." };
    d.registrations.push({
      id: uid("reg"), eventId: e.id, name, email, phone: phone || undefined, adults, children,
      status: full ? "waitlist" : "confirmed", duplicateOf: nameDup?.id, createdAt: new Date().toISOString(),
    });
    audit(d, w.id, name, "public_rsvp", `${e.name}: ${adults} adults, ${children} children${full ? " (waitlist)" : ""}`);
    return full
      ? { ok: true, message: "The event is currently at capacity, so we've added you to the waitlist. We'll email you if a spot opens." }
      : { ok: true, message: `Thank you! We've noted ${adults + children} ${adults + children === 1 ? "guest" : "guests"} for the ${e.name}. We look forward to seeing you.` };
  });
}

/**
 * Guest verification: a guest who lost their link enters their email or phone.
 * We always respond the same way (no account enumeration) and deliver the link
 * only to the contact already on file (simulated in Dashboard → Invitations → Outbox).
 */
export async function findInvitation(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const w = findWedding(slug);
  if (!w) return { error: "Wedding not found." };
  const contact = String(form.get("contact") ?? "").trim();
  if (contact.length < 5) return { error: "Please enter the email or phone number your invitation was sent to." };
  mutate((d) => {
    const h = d.households.find((x) => x.weddingId === w.id && (
      (x.email && normEmail(x.email) === normEmail(contact)) || (x.phone && normPhone(x.phone) === normPhone(contact) && normPhone(contact).length >= 10)));
    const t = h && d.tokens.find((x) => x.householdId === h.id && !x.revokedAt);
    if (h && t) {
      const byEmail = !!h.email && normEmail(h.email) === normEmail(contact);
      d.outbox.unshift({
        id: uid("msg"), weddingId: w.id, channel: byEmail ? "email" : "whatsapp", to: byEmail ? h.email! : h.phone!, householdId: h.id,
        subject: `Your invitation from ${w.partner1} & ${w.partner2}`,
        body: `Assalamu alaikum ${h.name}, here is your personal invitation link: /i/${t.token}`,
        kind: "verification", createdAt: new Date().toISOString(),
      });
      audit(d, w.id, "Guest", "link_lookup", `Invitation link re-sent to ${h.name}`);
    }
  });
  return { ok: true, message: "If that matches an invitation, we've just sent your personal link to the email or WhatsApp number on file." };
}

export async function unlockSite(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const w = findWedding(slug);
  if (!w) return { error: "Wedding not found." };
  if (String(form.get("password") ?? "") !== (w.sitePassword ?? "")) return { error: "That password doesn't look right." };
  await grantSiteAccess(w);
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true };
}

export async function forgetInvitation(slug: string) {
  (await cookies()).delete(GUEST_COOKIE);
  revalidatePath(`/w/${slug}`, "layout");
}
