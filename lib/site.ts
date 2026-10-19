import "server-only";
import { cache } from "react";
import { db } from "./db";
import { guestHousehold, hasSiteAccess, organizerContext } from "./auth";
import { visibleEvents } from "./access";
import { effectivePlan, hasFeature } from "./plans";
import type { Guest, Household, Rsvp, Wedding, WeddingEvent } from "./types";

/** Wedding fields that are safe to send to any visitor. Never includes mahr, password, budget. */
export type PublicWedding = Pick<Wedding,
  "id" | "slug" | "partner1" | "partner2" | "partner1Family" | "partner2Family" | "tagline" | "heroImage" |
  "story" | "gallery" | "faqs" | "travel" | "registry" | "theme" | "culture">;

/** Event fields shown to guests (no budget / internal sort data). */
export type PublicEvent = Omit<WeddingEvent, "budget" | "weddingId" | "sortOrder" | "capacity"> & { spotsLeft?: number | null };

export interface GuestView {
  household: Pick<Household, "id" | "name">;
  members: Pick<Guest, "id" | "firstName" | "lastName" | "isChild" | "isPlusOne" | "dietary">[];
  invitations: { eventId: string; guestIds: string[] }[];
  rsvps: Pick<Rsvp, "eventId" | "guestId" | "status" | "meal" | "updatedAt">[];
}

export interface SiteData {
  wedding: PublicWedding;
  events: PublicEvent[];
  guest: GuestView | null;
  locked: boolean;
  isOrganizer: boolean;
  showBranding: boolean;
}

function toPublicWedding(w: Wedding): PublicWedding {
  const { id, slug, partner1, partner2, partner1Family, partner2Family, tagline, heroImage, story, gallery, faqs, travel, registry, theme, culture } = w;
  return { id, slug, partner1, partner2, partner1Family, partner2Family, tagline, heroImage, story, gallery, faqs, travel, registry, theme, culture };
}

export function toPublicEvent(e: WeddingEvent): PublicEvent {
  const { budget: _b, weddingId: _w, sortOrder: _s, capacity, ...rest } = e;
  let spotsLeft: number | null = null;
  if (e.visibility === "public" && capacity) {
    const used = db().registrations.filter((r) => r.eventId === e.id && r.status === "confirmed").reduce((n, r) => n + r.adults + r.children, 0);
    spotsLeft = Math.max(0, capacity - used);
  }
  return { ...rest, spotsLeft };
}

export const findWedding = cache((slug: string) => db().weddings.find((w) => w.slug === slug) ?? null);

/** Everything the wedding website may render for the current visitor — computed server-side. */
export const getSite = cache(async (slug: string): Promise<SiteData | null> => {
  const w = findWedding(slug);
  if (!w) return null;
  const org = await organizerContext();
  const isOrganizer = org?.wedding.id === w.id;
  if (!w.published && !isOrganizer) return null;

  const household = await guestHousehold(w.id);
  const locked = !(await hasSiteAccess(w));
  const events = locked ? [] : visibleEvents(w.id, household).map(toPublicEvent);

  let guest: GuestView | null = null;
  if (household && !locked) {
    const d = db();
    const visibleIds = new Set(events.map((e) => e.id));
    const invitations = d.invitations
      .filter((i) => i.householdId === household.id && visibleIds.has(i.eventId))
      .map((i) => ({ eventId: i.eventId, guestIds: i.guestIds }));
    guest = {
      household: { id: household.id, name: household.name },
      members: d.guests.filter((g) => g.householdId === household.id)
        .map(({ id, firstName, lastName, isChild, isPlusOne, dietary }) => ({ id, firstName, lastName, isChild, isPlusOne, dietary })),
      invitations,
      rsvps: d.rsvps.filter((r) => r.householdId === household.id && visibleIds.has(r.eventId))
        .map(({ eventId, guestId, status, meal, updatedAt }) => ({ eventId, guestId, status, meal, updatedAt })),
    };
  }
  return { wedding: toPublicWedding(w), events, guest, locked, isOrganizer, showBranding: !hasFeature(effectivePlan(w), "remove_branding") };
});
