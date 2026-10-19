import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { islamicDate, longDate, shortDate } from "@/lib/format";
import { Countdown } from "@/components/site/client";
import { Bismillah, EventSummaryCard, Ornament, SectionTitle } from "@/components/site/parts";

export default async function SiteHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site || site.locked) notFound();
  const { wedding: w, events, guest } = site;
  const base = `/w/${slug}`;
  // Dates shown are derived only from events this visitor may see.
  const first = events[0], last = events[events.length - 1];
  const dateLine = first ? (first.date === last.date ? longDate(first.date) : `${shortDate(first.date)} – ${shortDate(last.date)}`) : "";
  const pendingCount = guest ? guest.invitations.reduce((n, inv) => n + inv.guestIds.filter((g) => !guest.rsvps.some((r) => r.eventId === inv.eventId && r.guestId === g && r.status !== "pending")).length, 0) : 0;

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--site-bg)]/85 via-[var(--site-bg)]/85 to-[var(--site-bg)]" />
        </div>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-16 text-center sm:pt-24">
          {w.culture.showBismillah && <Bismillah className="fade-in leading-[2.2]" />}
          <p className="fade-in mt-6 text-[11px] uppercase tracking-[0.32em] text-[var(--site-muted)]">Together with their families</p>
          <h1 className="heading fade-in mt-5 text-6xl leading-[0.95] sm:text-8xl">
            {w.partner1}
            <span className="my-2 block text-4xl italic text-[var(--site-accent)] sm:text-5xl">&amp;</span>
            {w.partner2}
          </h1>
          {w.culture.urduNames.partner1 && (
            <p dir="rtl" lang="ur" className="mt-6 font-urdu text-xl leading-[2.2] text-[var(--site-muted)]">
              {w.culture.urduNames.partner1} و {w.culture.urduNames.partner2}
            </p>
          )}
          <Ornament className="my-6" />
          <p className="heading text-2xl italic">{w.tagline}</p>
          {dateLine && <p className="mt-4 text-sm uppercase tracking-[0.2em]">{dateLine}</p>}
          {first && w.culture.islamicDates && <p className="mt-1 text-xs text-[var(--site-muted)]">{islamicDate(first.date)}</p>}
          {guest && pendingCount > 0 && (
            <Link href={`${base}/rsvp`} className="mt-8 inline-flex h-12 items-center rounded-full bg-[var(--site-accent)] px-8 text-sm font-medium text-[var(--site-accent-ink)] hover:opacity-90">
              Respond to your invitation
            </Link>
          )}
        </div>
      </section>

      {first && (
        <section className="px-6 py-14">
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--site-muted)]">Counting down to the {first.name}</p>
          <Countdown to={`${first.date}T${first.startTime}:00`} />
        </section>
      )}

      {w.culture.verse.enabled && (
        <section className="jali-bg border-y border-[var(--site-line)] px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2] sm:text-3xl">{w.culture.verse.arabic}</p>
            <p className="heading mt-6 text-xl italic text-[var(--site-muted)] sm:text-2xl">&ldquo;{w.culture.verse.translation}&rdquo;</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-[var(--site-accent)]">{w.culture.verse.reference}</p>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <SectionTitle eyebrow={guest ? "Your invitation" : "Join us"} title={events.length === 1 ? "The celebration" : "The celebrations"} />
          <div className={`mx-auto mt-12 grid gap-6 ${events.length === 1 ? "max-w-sm" : events.length === 2 ? "max-w-3xl sm:grid-cols-2" : events.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {events.map((e) => <EventSummaryCard key={e.id} e={e} href={`${base}/events#${e.id}`} islamic={w.culture.islamicDates} />)}
          </div>
          {!guest && (
            <p className="mx-auto mt-10 max-w-xl text-center text-sm text-[var(--site-muted)]">
              Received a personal invitation? Open the link from your message, or <Link href={`${base}/rsvp#find`} className="underline underline-offset-2">find your invitation</Link>.
            </p>
          )}
        </section>
      )}

      {w.story.length > 0 && (
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-10 md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.gallery[1] ?? w.heroImage} alt="" className="arch-mask aspect-[4/5] w-full object-cover" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--site-muted)]">Our story</p>
            <h2 className="heading mt-2 text-5xl">{w.story[0].title}</h2>
            <p className="mt-5 leading-relaxed text-[var(--site-muted)]">{w.story[0].body}</p>
            <Link href={`${base}/story`} className="mt-6 inline-block text-xs uppercase tracking-[0.18em] text-[var(--site-accent)] hover:underline">Read more</Link>
          </div>
        </section>
      )}
    </>
  );
}
