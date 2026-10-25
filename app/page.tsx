import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Eye, Link2, Lock, Image as ImageIcon, Mail, MessageSquare, PiggyBank, Users } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/site-header";
import { TwoViews } from "@/components/landing/two-views";
import { SITE_PHOTOS } from "@/lib/photos";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const FEATURES = [
  { icon: Mail, title: "A tidy guest list", body: "Households, plus-ones and children, by family and side. Import yours in one go." },
  { icon: CalendarDays, title: "Every event, one plan", body: "Each celebration has its own guest list, details and RSVPs, all in one place." },
  { icon: Users, title: "Planned together", body: "Invite family or a planner, each with exactly the access they need." },
  { icon: MessageSquare, title: "RSVPs, handled", body: "Replies and meal choices come in on their own, with gentle reminders by email or text." },
  { icon: PiggyBank, title: "A budget that adds up", body: "Track every cost by event, and who's covering what." },
  { icon: ImageIcon, title: "A website that's yours", body: "Your photos, your colors, your words. Change anything, any time." },
];

const STEPS = [
  { n: "01", title: "Add your events", body: "One day or five. A ceremony, a dinner, a brunch, whatever you're celebrating." },
  { n: "02", title: "Invite your guests", body: "Import your list and send each household its personal invitation." },
  { n: "03", title: "Watch replies arrive", body: "See who's coming to what, and follow up with one click." },
];

const DEMO = [
  { mode: "admin", label: "As the couple", sub: "The planning dashboard" },
  { mode: "all", label: "As a guest", sub: "A personal invitation" },
  { mode: "vendor", label: "As a vendor", sub: "Listing and inquiries" },
];

/**
 * The hero's right side: a few cards from the product on a soft gradient, showing what
 * Qubool does (a guest's own invitation, replies coming in) instead of a stock photo.
 */
function HeroPreview() {
  const shadow = "shadow-[0_24px_60px_-28px_rgba(43,38,32,0.35)]";
  return (
    <div className="relative aspect-[3/5] w-full overflow-hidden rounded-[28px] bg-[#f6efe6] sm:aspect-[4/3] lg:aspect-square" aria-label="A preview of Qubool: a guest's invitation and RSVP replies" role="img">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_15%,#f3dcd5_0%,transparent_70%),radial-gradient(55%_45%_at_85%_80%,#e3e8de_0%,transparent_70%),radial-gradient(45%_40%_at_80%_10%,#efe2c9_0%,transparent_70%)]" />

      {/* A guest's personal invitation */}
      <div className={`absolute left-[12%] right-[10%] top-[9%] rounded-2xl bg-white p-6 sm:p-7 ${shadow}`}>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">You&apos;re invited</p>
        <p className="mt-3 text-sm text-muted">Dear Chen family,</p>
        <p className="mt-1 font-serif text-[2rem] leading-none tracking-tight sm:text-4xl">Jordan &amp; Priya</p>
        <ul className="mt-5 space-y-2.5 text-sm">
          {[["Welcome dinner", "Fri, June 11"], ["Ceremony", "Sat, June 12"], ["Reception", "Sat, June 12"]].map(([e, d]) => (
            <li key={e} className="flex items-center justify-between gap-3 border-t border-line/70 pt-2.5"><span>{e}</span><span className="text-xs text-muted">{d}</span></li>
          ))}
        </ul>
        <span className="mt-5 inline-flex h-9 items-center rounded-full bg-ink px-5 text-xs font-medium text-ivory">RSVP</span>
      </div>

      {/* Replies coming in */}
      <div className={`absolute bottom-[7%] left-[5%] w-[52%] rounded-2xl bg-white p-4 ${shadow}`}>
        <p className="text-xs text-muted">Replies</p>
        <p className="mt-1 font-serif text-3xl tracking-tight">128<span className="text-base text-muted"> of 160</span></p>
        <div className="mt-2.5 h-1.5 rounded-full bg-cream"><div className="h-1.5 w-[80%] rounded-full bg-sage" /></div>
      </div>

      {/* A delivered note */}
      <div className={`absolute bottom-[12%] right-[6%] flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs ${shadow}`}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sage text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
        The Chens replied
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-8">
          <div className="fade-in min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-sm text-ink/80">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Wedding planning, simplified
            </span>
            <h1 className="mt-5 font-serif text-[3.25rem] leading-[1.02] tracking-tight min-[400px]:text-6xl sm:text-7xl">
              One Wedding.<br /><span className="italic text-gold">Every Celebration.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/75">
              Every guest gets their own invitation, showing only the events they&apos;re invited to. Plus your website, guest list and RSVPs, all in one calm place.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href="/beta" size="lg">Request early access <ArrowRight className="h-4 w-4" /></ButtonLink>
              {demoEnabled() && <Link href="#demo" className="text-[15px] font-medium underline-offset-4 hover:underline">See a sample wedding</Link>}
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
              {["Free during the beta", "For couples and planners", "Invites sent in small groups"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-sage" />{t}</li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
              <div>
                <p className="text-sm font-medium text-gold">What makes Qubool different</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">A different invitation for every guest</h2>
                <p className="mt-4 text-lg leading-relaxed text-ink/75">
                  Most wedding websites show everyone everything. With Qubool, each household gets its own invitation, listing only the events you&apos;ve invited them to. Try it below: tick a box in your guest list, then see what that guest sees.
                </p>
              </div>
              <ul className="grid gap-x-8 gap-y-6 self-end sm:grid-cols-2">
                {[
                  [Link2, "Every household gets its own link", "Send it by email or text. No passwords, no accounts."],
                  [Eye, "They see only their events", "The Chens see the family brunch. Your colleagues never know it exists."],
                  [Lock, "Private events stay private", "Not hidden with a trick: the page simply never includes them."],
                  [Users, "One RSVP for the whole household", "Each person, each event, meal choices included."],
                ].map(([Icon, t, b]) => {
                  const I = Icon as typeof Eye;
                  return (
                    <li key={t as string} className="flex gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream"><I className="h-4 w-4 text-gold" strokeWidth={1.8} /></span>
                      <div><p className="font-medium">{t as string}</p><p className="mt-0.5 text-[15px] leading-relaxed text-ink/70">{b as string}</p></div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-10 min-w-0"><TwoViews /></div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Everything for the wedding, in one place</h2>
              <p className="mt-3 text-lg text-ink/70">The tools you actually need, and none you don&apos;t.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-line bg-ivory/60 p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Icon className="h-5 w-5 text-gold" strokeWidth={1.6} /></span>
                  <h3 className="mt-4 text-lg font-medium">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/70">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-cream/60">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_PHOTOS.receptionTable} alt="A long candlelit dinner table" loading="lazy" className="aspect-[4/3] w-full rounded-[28px] object-cover" />
            <div>
              <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">How it works</h2>
              <ol className="mt-8 space-y-6">
                {STEPS.map((s, i) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-ivory">{i + 1}</span>
                    <div>
                      <h3 className="text-lg font-medium">{s.title}</h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-ink/70">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <ButtonLink href="/beta" className="mt-8">Request early access <ArrowRight className="h-4 w-4" /></ButtonLink>
            </div>
          </div>
        </section>

        {demoEnabled() && (
          <section id="demo" className="scroll-mt-6 bg-white">
            <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
              <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
                <div>
                  <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">See a sample wedding</h2>
                  <p className="mt-3 max-w-sm text-lg text-ink/70">Look around a four-day wedding with private events and different guest lists. Nothing you do there is sent or saved for real.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {DEMO.map((m) => (
                    <Link key={m.mode} href={`/demo/${m.mode}`} prefetch={false}
                      className="group flex flex-col rounded-2xl border border-line bg-ivory/60 p-5 transition hover:border-ink hover:bg-white">
                      <span className="text-lg font-medium">{m.label}</span>
                      <span className="mt-1 text-[15px] text-ink/70">{m.sub}</span>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Simple pricing</h2>
                <p className="mt-3 text-lg text-ink/70">Complimentary for beta members. After the beta: free to start, and one payment per wedding if you need more.</p>
              </div>
              <Link href="/pricing" className="text-[15px] font-medium underline-offset-4 hover:underline">Compare plans</Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PLAN_ORDER.map((p) => (
                <div key={p} className={`flex flex-col rounded-2xl border bg-white p-6 ${p === "plus" ? "border-ink shadow-[0_20px_50px_-30px_rgba(43,38,32,0.4)]" : "border-line"}`}>
                  <div className="flex items-center justify-between"><p className="text-lg font-medium">{PLANS[p].name}</p>{p === "plus" && <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs">Most popular</span>}</div>
                  <p className="mt-3 font-serif text-5xl tracking-tight">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
                  <p className="mt-1 text-sm text-ink/60">{PLANS[p].billing}</p>
                  <ul className="mt-5 flex-1 space-y-2 text-[15px] text-ink/80">
                    {PLANS[p].highlights.slice(0, 4).map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{h}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="rounded-[28px] bg-ink px-8 py-14 text-center text-ivory sm:px-16">
            <h2 className="font-serif text-4xl tracking-tight sm:text-6xl">Join the Qubool beta.</h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-ivory/75">We&apos;re inviting couples and planners in small groups. Early access is complimentary.</p>
            <Link href="/beta" className="mt-8 inline-flex h-12 items-center rounded-full bg-ivory px-7 text-[15px] font-medium text-ink transition hover:bg-white">Request early access</Link>
            <p className="mt-6 text-[15px] text-ivory/70">
              Already invited? <Link href="/signup" className="underline underline-offset-2 hover:text-ivory">Create your account</Link>.{" "}
              Wedding vendor? <Link href="/founding-vendors" className="underline underline-offset-2 hover:text-ivory">Become a Founding Vendor</Link>.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-muted">
          <div className="flex items-center gap-3"><Logo className="text-xl text-ink" /><span className="hidden sm:inline">One Wedding. Every Celebration.</span></div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/marketplace" className="hover:text-ink">Vendors</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/sms" className="hover:text-ink">Text messages</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
