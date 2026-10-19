import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { EventDetail, SectionTitle } from "@/components/site/parts";

export const metadata = { title: "Events" };

export default async function EventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site || site.locked || !site.events.length) notFound();
  const w = site.wedding;
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <SectionTitle eyebrow={site.guest ? "Your invitation" : "Join us"} title="Events" />
      {(w.culture.modestyNote || w.culture.prayerNote) && (
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-[var(--site-muted)]">{[w.culture.modestyNote, w.culture.prayerNote].filter(Boolean).join(" ")}</p>
      )}
      <div className="mt-12 space-y-8">
        {site.events.map((e) => (
          <EventDetail key={e.id} id={e.id} e={e} islamic={w.culture.islamicDates} rsvpHref={`/w/${slug}/rsvp#${e.id}`}
            showRsvp={e.rsvpMode !== "none" && (e.visibility === "public" || !!site.guest?.invitations.some((i) => i.eventId === e.id))} />
        ))}
      </div>
    </div>
  );
}
