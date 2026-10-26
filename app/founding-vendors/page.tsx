import { BadgeCheck, CalendarHeart, Check, Sparkles, Users } from "lucide-react";
import { submitVendorApplication } from "@/lib/actions/programs";
import { LISTING_TIERS } from "@/lib/plans";
import { FOUNDING_SPOTS, foundingSpotsLeft } from "@/lib/programs";
import { SITE_PHOTOS } from "@/lib/photos";
import { Card, Progress } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { VendorApplicationForm } from "@/components/programs/forms";

export const metadata = {
  title: "Become a Founding Vendor",
  description: "Join the Qubool Founding 50: 12 months of free Featured listing for the first 50 approved wedding vendors.",
};
export const dynamic = "force-dynamic"; // the spots-left count is live

const WHY = [
  { icon: CalendarHeart, title: "Couples planning every event", body: "Qubool couples plan three to five events each: welcome dinners, henna nights, ceremonies, receptions and more. That's more bookings per couple." },
  { icon: Users, title: "Inquiries with context", body: "Every inquiry arrives with the date, the events, and the guest count, from couples who are already organized." },
  { icon: BadgeCheck, title: "Show what you know", body: "Tag the traditions and services you specialize in, so the right couples find you: halal menus, female teams, tea ceremonies, chuppahs, sofreh spreads." },
];

export default async function FoundingVendors() {
  const left = await foundingSpotsLeft();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="jali-bg border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">The Founding 50</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:text-6xl">Become a Founding Vendor</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              We&apos;re inviting 50 wedding businesses to grow with Qubool from day one. Approved founding vendors get <b className="text-ink">12 months of free Featured listing</b>, then an optional $10/month to keep it.
            </p>
            <div className="mt-7 max-w-sm">
              <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{left} of {FOUNDING_SPOTS} spots left</span><span className="text-muted">Reviewed personally</span></div>
              <Progress className="mt-2" value={((FOUNDING_SPOTS - left) / FOUNDING_SPOTS) * 100} />
            </div>
            <a href="#apply" className="mt-7 inline-flex h-12 items-center rounded-full bg-ink px-7 text-[15px] font-medium text-ivory hover:bg-ink/90">Apply now</a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_PHOTOS.receptionTable} alt="A long reception table set with flowers and candles" className="arch-mask aspect-[3/4] w-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_PHOTOS.gardenCeremony} alt="Guests seated for an outdoor wedding ceremony" className="mt-10 aspect-[3/4] w-full rounded-3xl object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {WHY.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream"><Icon className="h-5 w-5 text-gold" /></span>
              <h2 className="mt-4 font-serif text-2xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center font-serif text-4xl">Simple pricing for vendors</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">Listing is always free. Founding vendors get Featured free for their first year.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(Object.keys(LISTING_TIERS) as (keyof typeof LISTING_TIERS)[]).map((k) => {
              const t = LISTING_TIERS[k];
              return (
                <div key={k} className={`relative rounded-3xl border bg-ivory p-6 ${k === "featured" ? "border-ink shadow-lg" : "border-line"}`}>
                  {k === "featured" && <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-medium text-ivory"><Sparkles className="h-3 w-3" /> Free for 12 months for founding vendors</span>}
                  <p className="font-serif text-3xl">{t.name}</p>
                  <p className="mt-3 font-serif text-4xl">{t.price ? `$${t.price}` : "$0"}<span className="text-sm text-muted">{t.price ? " / month" : " forever"}</span></p>
                  <ul className="mt-4 space-y-1.5 text-sm">{t.perks.map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{p}</li>)}</ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl scroll-mt-6 px-6 py-16">
        <h2 className="font-serif text-4xl">Apply to the Founding 50</h2>
        <p className="mt-2 text-sm text-muted">
          Tell us about your business. We review every application personally. Once you&apos;re approved, you&apos;ll get an email to set up your listing, and your founding benefits apply automatically.
          {left === 0 && " All 50 founding spots are taken. Apply anyway and we'll add you to the waitlist, or list your business free."}
        </p>
        <Card className="mt-6 p-6 sm:p-8"><VendorApplicationForm action={submitVendorApplication} /></Card>
      </section>
      <SiteFooter />
    </div>
  );
}
