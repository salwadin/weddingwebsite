import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { findInvitation, registerPublic, submitHouseholdRsvp } from "@/lib/actions/site";
import { longDate, time12 } from "@/lib/format";
import { FindInvitationForm, PublicRsvpForm } from "@/components/site/client";
import { HouseholdRsvp } from "@/components/site/household-rsvp";
import { SectionTitle } from "@/components/site/parts";

export const metadata = { title: "RSVP" };

export default async function RsvpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site || site.locked) notFound();
  const { events, guest } = site;
  const invitedIds = new Set(guest?.invitations.map((i) => i.eventId) ?? []);
  const publicOpen = events.filter((e) => e.visibility === "public" && e.rsvpMode !== "none" && !invitedIds.has(e.id));
  const hasHousehold = guest && events.some((e) => invitedIds.has(e.id) && e.rsvpMode !== "none");

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6">
      <SectionTitle eyebrow={guest ? guest.household.name : "Kindly respond"} title="RSVP" />

      {hasHousehold && (
        <>
          <p className="mx-auto mt-6 max-w-xl text-center text-sm text-[var(--site-muted)]">
            Please respond for each member of your household for each event. You can return to this page to update your reply until the deadline.
          </p>
          <div className="mt-10">
            <HouseholdRsvp action={submitHouseholdRsvp.bind(null, slug)} events={events} guest={guest!} />
          </div>
        </>
      )}

      {publicOpen.map((e) => (
        <section key={e.id} id={e.id} className="mt-12 scroll-mt-28 rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)] p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--site-muted)]">Open invitation</p>
          <h3 className="heading mt-1 text-4xl">{e.name}</h3>
          <p className="mt-1 text-sm text-[var(--site-muted)]">{longDate(e.date)} · {time12(e.startTime)} · {e.venueName}</p>
          {e.publicMessage && <p className="heading mt-4 text-xl italic">{e.publicMessage}</p>}
          <div className="mt-6">
            <PublicRsvpForm action={registerPublic.bind(null, slug, e.id)} eventName={e.name} full={e.spotsLeft === 0} />
          </div>
        </section>
      ))}

      {!guest && (
        <section id="find" className="mt-12 scroll-mt-28 rounded-3xl bg-[var(--site-soft)] p-6 sm:p-8">
          <h3 className="heading text-3xl">Have a personal invitation?</h3>
          <p className="mt-2 text-sm text-[var(--site-muted)]">
            Open the link in your invitation message to see your events and RSVP for your family. Lost it? We&apos;ll send it again to the email or WhatsApp number the couple has on file.
          </p>
          <div className="mt-5"><FindInvitationForm action={findInvitation.bind(null, slug)} /></div>
        </section>
      )}

      {!hasHousehold && !publicOpen.length && guest && (
        <p className="mt-10 text-center text-[var(--site-muted)]">There&apos;s nothing to RSVP for right now.</p>
      )}
    </div>
  );
}
