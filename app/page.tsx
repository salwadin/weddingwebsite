import Link from "next/link";
import { ArrowRight, CalendarHeart, Eye, EyeOff, LayoutGrid, Lock, Mail, PiggyBank, Store, Users } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { DEMO_MODES } from "@/components/demo-bar";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/site-header";
import { TRADITIONS } from "@/lib/format";
import { SITE_PHOTOS } from "@/lib/photos";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const FEATURES = [
  { icon: Mail, title: "Personalized invitations", body: "Every household gets its own link and sees only the events they're invited to. Open the ceremony to everyone, keep the reception invitation-only, and keep the henna night or tea ceremony for family, without awkward “not invited” moments." },
  { icon: CalendarHeart, title: "Multiple events, one plan", body: "Welcome dinner, Nikah, tea ceremony, sangeet, reception, brunch. Each event has its own guest list, venue, timeline, dress code and RSVPs, all in one place." },
  { icon: Users, title: "Family collaboration", body: "Invite “The Ahmed Family” or “The Chens” as one household. Parents, siblings and planners get their own roles, and each side manages its own guests." },
  { icon: LayoutGrid, title: "Design studio", body: "Moodboards for every event and drag-and-drop floor plans for stages, dance floors, prayer rooms and tables, checked against your RSVP count." },
  { icon: PiggyBank, title: "Budgets that add up", body: "Track every event's budget, deposits and balances, and who's paying for what across both families." },
  { icon: Store, title: "Vendor coordination", body: "Find vendors who know your traditions, save them to your plan, and keep contracts, payments and outfit fittings on schedule." },
];

const GALLERY = [
  { src: SITE_PHOTOS.southAsianCeremony, alt: "Petals showered over a couple during a South Asian wedding ceremony" },
  { src: SITE_PHOTOS.gardenCeremony, alt: "Guests seated for an outdoor garden ceremony" },
  { src: SITE_PHOTOS.gardenCouple, alt: "A newlywed couple outdoors among white blossoms" },
  { src: SITE_PHOTOS.receptionTable, alt: "A long candlelit reception table" },
  { src: SITE_PHOTOS.floralCouple, alt: "A couple in front of a floral wall" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="jali-bg relative">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="fade-in min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">For multicultural, multi-day, multi-event weddings</p>
            <h1 className="mt-5 font-serif text-5xl leading-[0.95] min-[400px]:text-6xl sm:text-7xl">
              One Wedding.<br /><span className="italic text-gold">Every</span> Celebration.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Qubool is the all-in-one planning platform for weddings with more than one chapter. It brings personalized invitations, every event and guest list, both families, the budget, the design and the vendors into one beautifully simple place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">Start free <ArrowRight className="h-4 w-4" /></ButtonLink>
              {demoEnabled() && <ButtonLink href="#demo" size="lg" variant="outline">Try the live demo</ButtonLink>}
            </div>
            <p className="mt-4 text-xs text-muted">Every feature free for 14 days. No card required. <Link href="/beta" className="underline underline-offset-2">Or join the beta</Link> for complimentary early access.</p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="grid grid-cols-2 gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SITE_PHOTOS.chineseCouple} alt="A couple in red and gold wedding attire" className="arch-mask aspect-[3/4] w-full object-cover shadow-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SITE_PHOTOS.westAfricanCouple} alt="A couple in traditional West African wedding attire" className="mt-10 aspect-[3/4] w-full rounded-3xl object-cover shadow-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SITE_PHOTOS.malayCouple} alt="A couple in traditional Malay wedding attire" className="-mt-10 aspect-[3/4] w-full rounded-3xl object-cover shadow-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SITE_PHOTOS.beachCouple} alt="A couple holding hands on a beach" className="arch-mask aspect-[3/4] w-full object-cover shadow-xl" />
            </div>
            <div className="absolute -bottom-6 -left-4 rounded-2xl border border-line bg-white p-4 shadow-xl sm:-left-8">
              <p className="text-[10px] uppercase tracking-wider text-muted">One website, every layer</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-sage" /> Ceremony · open to all</div>
                <div className="flex items-center gap-2"><EyeOff className="h-3.5 w-3.5 text-rose" /> Tea ceremony · family only</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Reception · 300 invited</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Sunday brunch · 60 invited</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6 py-5 text-sm text-muted">
          <span className="text-xs uppercase tracking-[0.2em] text-gold">Made for every tradition</span>
          {TRADITIONS.filter((t) => t.value !== "custom").map((t) => <span key={t.value}>{t.label}</span>)}
          <span>and yours</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">All-in-one planning</p>
          <h2 className="mx-auto mt-3 max-w-3xl font-serif text-5xl">Even the most complex celebration, effortless</h2>
        </div>
        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream"><Icon className="h-4.5 w-4.5 text-gold" /></span>
              <h3 className="mt-4 font-serif text-2xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20" aria-label="Celebrations of every kind">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-6 sm:grid-cols-5">
          {GALLERY.map((g, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={g.src} src={g.src.replace("w=1200", "w=600")} alt={g.alt} loading="lazy"
              className={`aspect-[3/4] w-full object-cover ${i % 2 ? "rounded-3xl sm:mt-8" : "arch-mask"} ${i === 4 ? "hidden sm:block" : ""}`} />
          ))}
        </div>
        <p className="mt-6 text-center font-serif text-2xl italic text-muted">Big or intimate, one faith or two, three days or one: every celebration is welcome.</p>
      </section>

      {demoEnabled() && (
      <section id="demo" className="scroll-mt-6 bg-cream/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Live demo</p>
            <h2 className="mt-3 font-serif text-5xl">See one website through different eyes</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              Meet one example couple. Ayesha &amp; Omar&apos;s four-day wedding has a public Nikah, an invitation-only Shaadi and Walima with different guest lists, and a family-only Mehndi. Choose who to be:
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {DEMO_MODES.map((m, i) => (
              <Link key={m.mode} href={`/demo/${m.mode}`} prefetch={false}
                className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream font-serif text-lg">{i + 1}</span>
                <span className="mt-4 font-serif text-2xl leading-tight">{m.label}</span>
                <span className="mt-1 text-xs text-muted">{m.sub}</span>
                <span className="mt-3 text-xs text-muted">{m.sees}</span>
                <span className="mt-auto pt-5 text-xs font-medium uppercase tracking-wider text-gold group-hover:underline">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Pricing</p>
          <h2 className="mt-3 font-serif text-5xl">Start free. Upgrade when your guest list grows.</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((p) => (
            <div key={p} className={`rounded-3xl border p-6 ${p === "plus" ? "border-ink bg-white shadow-lg" : "border-line bg-white"}`}>
              <p className="font-serif text-3xl">{PLANS[p].name}</p>
              <p className="mt-1 text-sm text-muted">{PLANS[p].tagline}</p>
              <p className="mt-4 font-serif text-4xl">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
              <p className="text-xs text-muted">{PLANS[p].billing}</p>
              <ul className="mt-4 space-y-1.5 text-sm">{PLANS[p].highlights.slice(0, 5).map((h) => <li key={h}>· {h}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm"><Link href="/pricing" className="underline underline-offset-2">Compare plans in detail</Link></p>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl bg-ink p-8 text-ivory">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">For couples & planners</p>
            <p className="mt-3 font-serif text-4xl">Join the Qubool Beta</p>
            <p className="mt-2 flex-1 text-sm text-ivory/70">Complimentary early access for couples and professional planners. Help shape what we build next.</p>
            <ButtonLink href="/beta" className="mt-6 self-start bg-gold text-white hover:bg-gold/90">Request early access</ButtonLink>
          </div>
          <div className="flex flex-col rounded-3xl border border-line bg-white p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">For wedding vendors</p>
            <p className="mt-3 font-serif text-4xl">Become a Founding Vendor</p>
            <p className="mt-2 flex-1 text-sm text-muted">The first 50 approved vendors get 12 months of Featured listing free, then an optional $10/month. Listing is always free.</p>
            <ButtonLink href="/founding-vendors" className="mt-6 self-start">Apply to the Founding 50</ButtonLink>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-muted">
        <Logo className="text-lg" /><p className="mt-2">One Wedding. Every Celebration.</p>
        <p className="mt-3 space-x-3"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/terms" className="hover:text-ink">Terms</Link><Link href="/sms" className="hover:text-ink">Text messages</Link></p>
      </footer>
    </div>
  );
}
