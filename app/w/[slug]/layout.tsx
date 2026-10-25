import { patternBg } from "@/lib/site-style";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/site";
import { forgetInvitation, unlockSite } from "@/lib/actions/site";
import { SiteNav, PasswordGate } from "@/components/site/client";
import { Bismillah, Ornament } from "@/components/site/parts";
import { DemoBar } from "@/components/demo-bar";
import { isDemoWedding } from "@/lib/demo";

const HEADING: Record<string, string> = {
  cormorant: "var(--font-classic)", playfair: "var(--font-playfair)", marcellus: "var(--font-marcellus)",
};

// Metadata is derived from public fields only; private event names/dates never reach <head>.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await getSite((await params).slug);
  if (!site) return {};
  const names = `${site.wedding.partner1} & ${site.wedding.partner2}`;
  return { title: { default: names, template: `%s · ${names}` }, description: site.wedding.tagline, robots: { index: false } };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();
  const { wedding: w, events, guest } = site;
  const base = `/w/${slug}`;
  const style = {
    "--site-heading": HEADING[w.theme.heading],
    ...(w.theme.accent ? { "--site-accent": w.theme.accent } : {}),
  } as React.CSSProperties;

  const current = site.isOrganizer && !guest ? "Wedding administrator" : guest ? guest.household.name : "Public visitor";

  if (site.locked) {
    return (
      <div className={`site ${patternBg(w.theme)} flex min-h-screen items-center justify-center px-6`} data-theme={w.theme.id} style={style}>
        <div className="w-full max-w-md text-center">
          {w.culture.showBismillah && <Bismillah className="mb-6" />}
          <h1 className="heading text-5xl">{w.partner1} &amp; {w.partner2}</h1>
          <Ornament className="my-5" />
          <p className="text-sm text-[var(--site-muted)]">This website is password protected. Please enter the password from your invitation, or open your personal invitation link.</p>
          <PasswordGate action={unlockSite.bind(null, slug)} />
        </div>
        {isDemoWedding(w.id) && <DemoBar current={current} />}
      </div>
    );
  }

  const rsvpable = events.some((e) => e.rsvpMode !== "none");
  const nav = [
    { href: base, label: "Home" },
    guest && guest.invitations.length > 0 && { href: `${base}/invitation`, label: "Your invitation" },
    w.story.length > 0 && { href: `${base}/story`, label: "Our Story" },
    events.length > 0 && { href: `${base}/events`, label: "Events" },
    (w.travel.hotels.length > 0 || w.travel.intro) && { href: `${base}/travel`, label: "Travel" },
    w.gallery.length > 0 && { href: `${base}/gallery`, label: "Gallery" },
    w.faqs.length > 0 && { href: `${base}/faq`, label: "FAQ" },
    rsvpable && { href: `${base}/rsvp`, label: "RSVP" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="site min-h-screen" data-theme={w.theme.id} style={style}>
      {site.isOrganizer && !guest && (
        <div className="bg-[#2b2620] px-4 py-2 text-center text-xs text-[#fbf8f2]">
          You&apos;re signed in as an organizer, so this is the public view. Use the Demo switcher to preview a guest&apos;s view, or <Link className="underline" href="/dashboard">return to your dashboard</Link>.
        </div>
      )}
      <header className="relative z-20 border-b border-[var(--site-line)] bg-[var(--site-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href={base} className="heading text-2xl">{w.partner1[0]}<span className="mx-1 text-[var(--site-accent)]">&amp;</span>{w.partner2[0]}</Link>
          <SiteNav base={base} items={nav} />
        </div>
      </header>
      {guest && (
        <div className="border-b border-[var(--site-line)] bg-[var(--site-soft)] px-5 py-2.5 text-center text-xs sm:text-sm">
          {w.culture.showBismillah ? "Assalamu alaikum" : "Welcome"}, <b className="font-semibold">{guest.household.name}</b>. This page has been personalized for your invitation.
          <form action={forgetInvitation.bind(null, slug)} className="ml-2 inline">
            <button className="text-[var(--site-muted)] underline underline-offset-2">Not you?</button>
          </form>
        </div>
      )}
      <main>{children}</main>
      <footer className="mt-24 border-t border-[var(--site-line)] px-6 pb-28 pt-12 text-center">
        <p className="heading text-3xl">{w.partner1} &amp; {w.partner2}</p>
        <Ornament className="my-4" />
        {site.showBranding && <p className="text-xs text-[var(--site-muted)]">Made with love on <Link href="/" className="underline underline-offset-2">Qubool</Link></p>}
      </footer>
      {isDemoWedding(w.id) && <DemoBar current={current} />}
    </div>
  );
}
