import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Image as ImageIcon, Mail, MessageSquare, PiggyBank, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { TwoViews } from "@/components/landing/two-views";
import { SITE_PHOTOS } from "@/lib/photos";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const FEATURES = [
  { icon: Mail, title: "Personal links", body: "Every household, its own invitation." },
  { icon: CalendarDays, title: "Every event", body: "Dinners, ceremonies, brunches. All in one." },
  { icon: Users, title: "Plan together", body: "Bring in family or a planner." },
  { icon: MessageSquare, title: "RSVPs, handled", body: "Replies and reminders, by email or text." },
  { icon: PiggyBank, title: "Budget", body: "Every cost, every event." },
  { icon: ImageIcon, title: "Your website", body: "Your photos, colors and words." },
];

const STEPS = ["Add your events", "Invite your guests", "Watch replies arrive"];

const DEMO = [
  { mode: "admin", label: "As the couple" },
  { mode: "all", label: "As a guest" },
  { mode: "vendor", label: "As a vendor" },
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
    <div className="min-h-screen bg-[#f7f0e6]">
      {/* Warm hero band: header, promise, and the product */}
      <div className="relative overflow-hidden bg-[#f1e6d6]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_60%_at_10%_0%,#f6dcd2_0%,transparent_70%),radial-gradient(45%_55%_at_95%_100%,#e5e9da_0%,transparent_70%)]" />
        <div className="relative">
          <SiteHeader />
          <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-14 pt-2 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div className="fade-in min-w-0">
              <h1 className="font-serif text-[3.4rem] leading-[1] tracking-tight min-[400px]:text-6xl sm:text-7xl xl:text-[5.25rem]">
                One Wedding.<br /><span className="italic text-gold">Every Celebration.</span>
              </h1>
              <p className="mt-6 text-xl text-ink/80">A personal invitation for every guest.</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink href="/beta" size="lg">Request early access <ArrowRight className="h-4 w-4" /></ButtonLink>
                {demoEnabled() && <Link href="#demo" className="text-[15px] font-medium underline-offset-4 hover:underline">See a sample</Link>}
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-sm text-ink/70"><Check className="h-4 w-4 text-sage" /> Free during the beta</p>
            </div>
            <HeroPreview />
          </section>
        </div>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Every guest, <span className="italic text-gold">their own invitation.</span></h2>
            <p className="text-lg text-ink/70">Tick who&apos;s invited. They see only their events.</p>
          </div>
          <div className="mt-8 min-w-0"><TwoViews /></div>
        </section>

        <section className="bg-[#ece0cf]">
          <div className="mx-auto grid max-w-6xl gap-3 px-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-center gap-4 rounded-2xl bg-[#f8f2ea] p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink"><Icon className="h-5 w-5 text-gold-soft" strokeWidth={1.6} /></span>
                <div><h3 className="text-lg font-medium leading-tight">{title}</h3><p className="text-[15px] text-ink/70">{body}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_PHOTOS.receptionTable.replace("w=1200", "w=2000")} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/70" />
          <div className="relative mx-auto max-w-6xl px-6 py-16 text-ivory">
            <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">How it works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((t, i) => (
                <li key={t} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold font-serif text-2xl text-ink">{i + 1}</span>
                  <span className="font-serif text-2xl leading-tight">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {demoEnabled() && (
          <section id="demo" className="scroll-mt-6 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-14">
            <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Take a look</h2>
            <div className="flex flex-wrap gap-3">
              {DEMO.map((m) => (
                <Link key={m.mode} href={`/demo/${m.mode}`} prefetch={false}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/20 bg-[#fbf6ef] px-6 text-[15px] font-medium transition hover:border-ink hover:bg-white">
                  {m.label} <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="bg-[#ece0cf]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Pricing</h2>
              <p className="text-lg text-ink/70">Free during the beta. <Link href="/pricing" className="font-medium text-ink underline-offset-4 hover:underline">Compare plans</Link></p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {PLAN_ORDER.map((p) => (
                <div key={p} className={`flex flex-col rounded-2xl p-6 ${p === "plus" ? "bg-ink text-ivory" : "bg-[#f8f2ea]"}`}>
                  <p className="text-lg font-medium">{PLANS[p].name}</p>
                  <p className="mt-2 font-serif text-5xl tracking-tight">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
                  <p className={`mt-1 text-sm ${p === "plus" ? "text-ivory/60" : "text-ink/60"}`}>{PLANS[p].billing}</p>
                  <ul className="mt-5 space-y-1.5 text-[15px]">
                    {PLANS[p].highlights.slice(1, 4).map((h) => <li key={h} className="flex gap-2"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p === "plus" ? "text-gold-soft" : "text-sage"}`} />{h}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
