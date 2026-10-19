import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/site";
import { EventDetail, Bismillah } from "@/components/site/parts";

// A shareable page for a single event (e.g. the public Nikkah link).
// An event the visitor can't see returns the exact same 404 as an id that doesn't exist.
async function load(slug: string, eventId: string) {
  const site = await getSite(slug);
  if (!site || site.locked) return null;
  const e = site.events.find((x) => x.id === eventId);
  return e ? { site, e } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; eventId: string }> }): Promise<Metadata> {
  const { slug, eventId } = await params;
  const r = await load(slug, eventId);
  return r ? { title: r.e.name, description: r.e.publicMessage || r.e.description } : {};
}

export default async function EventPage({ params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await params;
  const r = await load(slug, eventId);
  if (!r) notFound();
  const { site, e } = r;
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      {site.wedding.culture.showBismillah && <Bismillah className="mb-8 text-center" />}
      <p className="mb-6 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--site-muted)]">{site.wedding.partner1} &amp; {site.wedding.partner2}</p>
      <EventDetail e={e} islamic={site.wedding.culture.islamicDates} rsvpHref={`/w/${slug}/rsvp#${e.id}`}
        showRsvp={e.rsvpMode !== "none" && (e.visibility === "public" || !!site.guest?.invitations.some((i) => i.eventId === e.id))} />
    </div>
  );
}
