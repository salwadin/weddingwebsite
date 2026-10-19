import "server-only";
import { redirect } from "next/navigation";
import { organizerContext } from "./auth";
import { can, scopeEvents, scopeFor, scopeHouseholds, type Area, type Scope } from "./access";
import { db } from "./db";
import type { Database, Household, WeddingEvent } from "./types";

export interface Org {
  ctx: NonNullable<Awaited<ReturnType<typeof organizerContext>>>;
  scope: Scope;
  d: Database;
  events: WeddingEvent[]; // events this organizer may see
  households: Household[]; // households this organizer may see
}

/** Gate for every dashboard page and action: signed in, collaborator, permitted for `area`. */
export async function requireOrg(area: Area = "dashboard", level: "view" | "edit" = "view"): Promise<Org> {
  const ctx = await organizerContext();
  if (!ctx) {
    const user = await import("./auth").then((m) => m.currentUser());
    redirect(user ? "/onboarding" : "/login");
  }
  const scope = scopeFor(ctx.collaborator.role, ctx.collaborator.eventIds);
  if (!can(scope, area, level)) redirect("/dashboard?denied=" + area);
  const d = db();
  const events = scopeEvents(scope, d.events.filter((e) => e.weddingId === ctx.wedding.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder);
  return { ctx, scope, d, events, households: scopeHouseholds(scope, d, ctx.wedding.id) };
}

export interface EventStats {
  event: WeddingEvent;
  invitedGuests: number;
  invitedHouseholds: number;
  attending: number;
  declined: number;
  pending: number;
  adults: number;
  children: number;
  householdsResponded: number;
  householdsPartial: number;
  householdsPending: number;
  meals: Record<string, number>;
  missingMeals: number;
  publicConfirmed: number;
  publicWaitlist: number;
  publicRegistrations: number;
  expectedTotal: number;
}

export function eventStats(d: Database, e: WeddingEvent, households: Household[]): EventStats {
  const hh = new Set(households.map((h) => h.id));
  const invs = d.invitations.filter((i) => i.eventId === e.id && hh.has(i.householdId));
  const rsvps = new Map(d.rsvps.filter((r) => r.eventId === e.id).map((r) => [r.guestId, r]));
  const guests = new Map(d.guests.map((g) => [g.id, g]));
  const s: EventStats = {
    event: e, invitedGuests: 0, invitedHouseholds: invs.length, attending: 0, declined: 0, pending: 0, adults: 0, children: 0,
    householdsResponded: 0, householdsPartial: 0, householdsPending: 0, meals: {}, missingMeals: 0,
    publicConfirmed: 0, publicWaitlist: 0, publicRegistrations: 0, expectedTotal: 0,
  };
  for (const inv of invs) {
    let answered = 0;
    for (const gid of inv.guestIds) {
      s.invitedGuests++;
      const r = rsvps.get(gid);
      if (r?.status === "attending") {
        s.attending++; answered++;
        if (guests.get(gid)?.isChild) s.children++; else s.adults++;
        if (e.mealOptions.length) { if (r.meal) s.meals[r.meal] = (s.meals[r.meal] ?? 0) + 1; else s.missingMeals++; }
      } else if (r?.status === "declined") { s.declined++; answered++; }
      else s.pending++;
    }
    if (answered === inv.guestIds.length) s.householdsResponded++;
    else if (answered > 0) s.householdsPartial++;
    else s.householdsPending++;
  }
  if (e.visibility === "public") {
    for (const r of d.registrations.filter((x) => x.eventId === e.id && x.status !== "cancelled")) {
      s.publicRegistrations++;
      if (r.status === "confirmed") s.publicConfirmed += r.adults + r.children; else s.publicWaitlist += r.adults + r.children;
    }
  }
  s.expectedTotal = s.attending + s.publicConfirmed;
  return s;
}

export interface Discrepancy { level: "warn" | "info"; text: string; href?: string }

export function discrepancies(d: Database, events: WeddingEvent[], households: Household[]): Discrepancy[] {
  const out: Discrepancy[] = [];
  const hh = new Set(households.map((h) => h.id));
  const evIds = new Set(events.map((e) => e.id));
  const invGuest = new Set(d.invitations.flatMap((i) => i.guestIds.map((g) => `${i.eventId}:${g}`)));

  const noContact = households.filter((h) => !h.email && !h.phone && d.invitations.some((i) => i.householdId === h.id));
  if (noContact.length) out.push({ level: "warn", text: `${noContact.length} invited households have no email or phone, so their invitation can't be delivered digitally.`, href: "/dashboard/guests?filter=no_contact" });
  const bounced = households.filter((h) => h.deliveryStatus === "bounced");
  if (bounced.length) out.push({ level: "warn", text: `${bounced.length} invitations bounced. Check their contact details.`, href: "/dashboard/guests?filter=bounced" });
  const notSent = households.filter((h) => h.deliveryStatus === "not_sent" && d.invitations.some((i) => i.householdId === h.id));
  if (notSent.length) out.push({ level: "info", text: `${notSent.length} households haven't been sent their invitation yet.`, href: "/dashboard/invitations" });

  const orphan = d.rsvps.filter((r) => hh.has(r.householdId) && evIds.has(r.eventId) && !invGuest.has(`${r.eventId}:${r.guestId}`));
  if (orphan.length) out.push({ level: "warn", text: `${orphan.length} RSVPs belong to guests who are no longer invited to that event (an invitation was changed after they replied).`, href: "/dashboard/rsvps" });

  for (const e of events) {
    if (e.mealOptions.length) {
      const missing = d.rsvps.filter((r) => r.eventId === e.id && r.status === "attending" && !r.meal && hh.has(r.householdId)).length;
      if (missing) out.push({ level: "info", text: `${missing} confirmed ${e.name} guests haven't chosen a meal.`, href: `/dashboard/rsvps?event=${e.id}` });
    }
    if (e.visibility === "public") {
      const dups = d.registrations.filter((r) => r.eventId === e.id && r.duplicateOf && r.status !== "cancelled").length;
      if (dups) out.push({ level: "warn", text: `${dups} possible duplicate public registrations for the ${e.name}.`, href: `/dashboard/rsvps?event=${e.id}` });
    }
    if (e.visibility !== "public" && e.rsvpMode !== "none") {
      const unnamed = d.guests.filter((g) => g.isPlusOne && g.firstName === "Guest" && hh.has(g.householdId) &&
        d.rsvps.some((r) => r.guestId === g.id && r.eventId === e.id && r.status === "attending")).length;
      if (unnamed) out.push({ level: "info", text: `${unnamed} attending plus-ones at the ${e.name} haven't been named.` });
    }
  }
  return out;
}

/** "Mehndi, Nikkah" style list of the events a household is invited to. */
export function householdEvents(d: Database, householdId: string, events: WeddingEvent[]) {
  const ids = new Set(d.invitations.filter((i) => i.householdId === householdId).map((i) => i.eventId));
  return events.filter((e) => ids.has(e.id));
}
