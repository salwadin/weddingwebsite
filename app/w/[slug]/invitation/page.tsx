import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSite } from "@/lib/site";
import { invitationSvg } from "@/lib/invitation-card";
import { islamicDate, longDate, time12 } from "@/lib/format";
import { Ornament } from "@/components/site/parts";

export const metadata = { robots: { index: false } };

/**
 * Where a guest's personal link lands (/i/<token>): their invitation to each event
 * they're invited to, the couple's uploaded design or the designed card addressed
 * to their household, with RSVP right underneath. Like opening an envelope.
 */
export default async function GuestInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site || site.locked) notFound();
  const base = `/w/${slug}`;
  const { wedding: w, guest } = site;
  if (!guest) redirect(base);

  // guest_site() already limits events and designs to what this household may see.
  const invited = site.events.filter((e) => guest.invitations.some((i) => i.eventId === e.id));
  if (!invited.length) redirect(base);
  const names = `${w.partner1} & ${w.partner2}`;

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-12 text-center">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--site-muted)]">Your invitation</p>
      <h1 className="heading mt-4 text-4xl sm:text-5xl">Dear {guest.household.name}</h1>
      <p className="mt-3 text-[var(--site-muted)]">
        {names} would be honored by your presence{invited.length > 1 ? ` at ${invited.length} celebrations` : ""}.
      </p>
      <Ornament className="my-8" />

      <div className="space-y-16">
        {invited.map((e) => {
          const d = site.designs.find((x) => x.eventId === e.id);
          const inv = guest.invitations.find((i) => i.eventId === e.id)!;
          const answered = inv.guestIds.filter((g) => guest.rsvps.some((r) => r.eventId === e.id && r.guestId === g && r.status !== "pending")).length;
          const svg = d?.imageUrl ? null : invitationSvg({
            template: d && d.template !== "custom" ? d.template : "arch",
            englishText: d?.englishText || `Together with their families, ${names} invite you to their ${e.name}`,
            urduText: d?.urduText ?? "", arabicText: d?.arabicText ?? "",
            eventName: e.name, names, dateLine: longDate(e.date), islamicLine: w.culture.islamicDates ? islamicDate(e.date) : "",
            timeLine: `${time12(e.startTime)} onwards`, venue: e.venueName, address: e.address,
          }, { dear: guest.household.name });
          return (
            <section key={e.id} aria-label={`Invitation to the ${e.name}`}>
              {d?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.imageUrl} alt={`Invitation to the ${e.name}`} className="mx-auto w-full max-w-md rounded-xl shadow-[0_24px_70px_-30px_rgba(43,38,32,0.55)]" />
              ) : (
                <div className="mx-auto max-w-md overflow-hidden rounded-xl shadow-[0_24px_70px_-30px_rgba(43,38,32,0.55)] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg! }} />
              )}
              <h2 className="heading mt-8 text-3xl">{e.name}</h2>
              <p className="mt-2 text-sm">{longDate(e.date)} · {time12(e.startTime)}</p>
              <p className="text-sm text-[var(--site-muted)]">{e.venueName}{e.address ? `, ${e.address}` : ""}</p>
              {e.rsvpMode !== "none" && (
                <p className="mt-3 text-xs text-[var(--site-muted)]">
                  {answered === 0 ? "Awaiting your reply" : answered < inv.guestIds.length ? `${answered} of ${inv.guestIds.length} replied` : "Thank you, you've replied"}
                </p>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {e.rsvpMode !== "none" && (
                  <Link href={`${base}/rsvp`} className="inline-flex h-11 items-center rounded-full bg-[var(--site-accent)] px-7 text-sm font-medium text-[var(--site-accent-ink)] hover:opacity-90">
                    {answered === inv.guestIds.length ? "Change your RSVP" : "RSVP"}
                  </Link>
                )}
                <Link href={`${base}/events/${e.id}`} className="inline-flex h-11 items-center rounded-full border border-[var(--site-line)] px-7 text-sm hover:bg-[var(--site-soft)]">
                  Event details
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      <Ornament className="my-12" />
      <Link href={base} className="text-sm underline underline-offset-4">Explore {names}&apos;s wedding website</Link>
    </div>
  );
}
