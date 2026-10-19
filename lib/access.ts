import "server-only";
import { db } from "./db";
import type { Database, Household, Role, Side, WeddingEvent } from "./types";

/* =====================================================================
 * GUEST VISIBILITY — the central rule of the platform.
 *
 * A visitor sees an event only if:
 *   (a) the event is public, or
 *   (b) their household holds an invitation to that event.
 * Everything rendered on the wedding website flows through this function
 * on the server. Hidden events are never serialized into HTML, RSC payloads,
 * metadata, or API responses, so there is nothing to "unhide" client-side.
 * ===================================================================== */
export function visibleEvents(weddingId: string, household: Household | null): WeddingEvent[] {
  const d = db();
  const invited = household
    ? new Set(d.invitations.filter((i) => i.householdId === household.id).map((i) => i.eventId))
    : new Set<string>();
  return d.events
    .filter((e) => e.weddingId === weddingId && (e.visibility === "public" || invited.has(e.id)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder);
}

/** Lookup that behaves identically for "doesn't exist" and "not allowed" (no existence oracle). */
export function findVisibleEvent(weddingId: string, eventId: string, household: Household | null) {
  return visibleEvents(weddingId, household).find((e) => e.id === eventId) ?? null;
}

/** Can this household RSVP to this event? Visibility and RSVP eligibility are separate checks. */
export function rsvpEligibility(e: WeddingEvent, household: Household | null) {
  if (e.rsvpMode === "none") return { kind: "none" as const };
  const inv = household && db().invitations.find((i) => i.householdId === household.id && i.eventId === e.id);
  if (inv) return { kind: "household" as const, invitation: inv };
  if (e.visibility === "public") return { kind: "public" as const };
  return { kind: "none" as const };
}

/* =====================================================================
 * ORGANIZER PERMISSIONS
 * ===================================================================== */
export type Area =
  | "dashboard" | "website" | "events" | "guests" | "invitations" | "rsvps"
  | "checklist" | "budget" | "vendors" | "settings" | "mahr";

const V = "view", E = "edit";
type Level = typeof V | typeof E;

const MATRIX: Record<Role, Partial<Record<Area, Level>>> = {
  admin: { dashboard: E, website: E, events: E, guests: E, invitations: E, rsvps: E, checklist: E, budget: E, vendors: E, settings: E, mahr: E },
  bride_organizer: { dashboard: V, website: V, events: E, guests: E, invitations: E, rsvps: E, checklist: E, budget: E, vendors: V },
  groom_organizer: { dashboard: V, website: V, events: E, guests: E, invitations: E, rsvps: E, checklist: E, budget: E, vendors: V },
  event_organizer: { dashboard: V, events: E, guests: V, invitations: E, rsvps: V, checklist: E, vendors: V },
  guest_manager: { dashboard: V, website: V, events: V, guests: E, invitations: E, rsvps: E, checklist: V },
  budget_manager: { dashboard: V, events: V, checklist: V, budget: E, vendors: E },
  viewer: { dashboard: V, website: V, events: V, guests: V, invitations: V, rsvps: V, checklist: V, budget: V, vendors: V },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Full administrator",
  bride_organizer: "Bride-side organizer",
  groom_organizer: "Groom-side organizer",
  event_organizer: "Event organizer",
  guest_manager: "Guest list manager",
  budget_manager: "Budget manager",
  viewer: "Read-only collaborator",
};

export interface Scope {
  role: Role;
  side: Side | null; // households restricted to this side (+ "both")
  eventIds: string[] | null; // events restricted to these
}

export function scopeFor(role: Role, eventIds?: string[]): Scope {
  return {
    role,
    side: role === "bride_organizer" ? "bride" : role === "groom_organizer" ? "groom" : null,
    eventIds: role === "event_organizer" ? eventIds ?? [] : null,
  };
}

export function can(scope: Scope, area: Area, level: Level = V) {
  const l = MATRIX[scope.role][area];
  return level === V ? !!l : l === E;
}

export function scopeEvents(scope: Scope, events: WeddingEvent[]) {
  return scope.eventIds ? events.filter((e) => scope.eventIds!.includes(e.id)) : events;
}

export function canEditEvent(scope: Scope, e: WeddingEvent) {
  if (!can(scope, "events", E)) return false;
  if (scope.eventIds) return scope.eventIds.includes(e.id);
  if (scope.side) return e.hostSide === scope.side || e.hostSide === "both";
  return true;
}

export function scopeHouseholds(scope: Scope, d: Database, weddingId: string) {
  let hs = d.households.filter((h) => h.weddingId === weddingId);
  if (scope.side) hs = hs.filter((h) => h.side === scope.side || h.side === "both");
  if (scope.eventIds) {
    const ids = new Set(d.invitations.filter((i) => scope.eventIds!.includes(i.eventId)).map((i) => i.householdId));
    hs = hs.filter((h) => ids.has(h.id));
  }
  return hs;
}

export function canTouchHousehold(scope: Scope, h: Household, d: Database) {
  return scopeHouseholds(scope, d, h.weddingId).some((x) => x.id === h.id);
}
