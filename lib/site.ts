import "server-only";
import { cache } from "react";
import { currentUser, guestToken, siteKey } from "./auth";
import { fromRow, weddingFromRow, type Row } from "./rows";
import { anonClient, serverClient } from "./supabase/server";
import { artUrl } from "./invitation-art";
import type { Guest, Household, InvitationDesign, Rsvp, Wedding, WeddingEvent } from "./types";

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

/** An event's invitation as a guest sees it: the designed card's wording, or the couple's uploaded artwork. */
export type PublicDesign = Pick<InvitationDesign, "eventId" | "template" | "englishText" | "urduText" | "arabicText"> & { imageUrl: string | null };

export interface SiteData {
  wedding: PublicWedding;
  events: PublicEvent[];
  /** Invitation designs for the events above (only those). */
  designs: PublicDesign[];
  guest: GuestView | null;
  locked: boolean;
  isOrganizer: boolean;
  showBranding: boolean;
}

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const camelize = <T,>(o: Row) => Object.fromEntries(Object.entries(o).map(([k, v]) => [camel(k), v ?? undefined])) as T;

/**
 * Everything the wedding website may render for the current visitor, as decided
 * by the guest_site() database function: public events, plus the events this
 * visitor's invitation link covers. Signed-in organizers call it with their own
 * session so they can preview an unpublished or password-protected site.
 */
export const getSite = cache(async (slug: string): Promise<SiteData | null> => {
  const sb = (await currentUser()) ? await serverClient() : anonClient();
  const { data, error } = await sb.rpc("guest_site", { p_slug: slug, p_token: await guestToken(), p_site_key: await siteKey(slug) });
  if (error) throw new Error(`guest_site: ${error.message}`);
  if (!data) return null;
  const r = data as Row;

  const events = (r.events as Row[]).map((e) => {
    const { spots_left, ...row } = e;
    return { ...fromRow("events", row), spotsLeft: (spots_left as number | null) ?? null } as PublicEvent;
  });
  const h = r.household as Row | null;
  const guest: GuestView | null = h ? {
    household: { id: h.id as string, name: h.name as string },
    members: (h.members as Row[]).map((m) => camelize<GuestView["members"][number]>(m)),
    invitations: (h.invitations as Row[]).map((i) => camelize<GuestView["invitations"][number]>(i)),
    rsvps: (h.rsvps as Row[]).map((x) => camelize<GuestView["rsvps"][number]>(x)),
  } : null;
  const wedding = weddingFromRow(r.wedding as Row) as PublicWedding;
  // guest_site() returns designs only for events this visitor may see; uploaded artwork is signed per request.
  const designs = await Promise.all(((r.designs as Row[] | undefined) ?? []).map(async (x) => {
    const { image_path, ...rest } = x;
    const d = camelize<Omit<PublicDesign, "imageUrl">>(rest);
    return { ...d, imageUrl: d.template === "custom" ? await artUrl(wedding.id, image_path as string | null) : null };
  }));
  return {
    wedding, events, designs, guest,
    locked: !!r.locked, isOrganizer: !!r.is_organizer, showBranding: !!r.show_branding,
  };
});
