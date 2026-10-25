import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Image as ImageIcon, Mail, MessageSquare, PiggyBank, Users } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/site-header";
import { SITE_PHOTOS } from "@/lib/photos";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const FEATURES = [
  { icon: Mail, title: "Personal invitations", body: "Every household gets its own link and sees only the events they're invited to." },
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
    <div className="relative aspect-[3/5] w-full overflow-hidden rounded-[28px] bg-[#f6efe6] sm:aspect-[4/5]" aria-label="A preview of Qubool: a guest's invitation and RSVP replies" role="img">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_15%,#f3dcd5_0%,transparent_70%),radial-gradient(55%_45%_at_85%_80%,#e3e8de_0%,transparent_70%),radial-gradient(45%_40%_at_80%_10%,#efe2c9_0%,transparent_70%)]" />

      {/* A guest's personal invitation */}
      <div className={`absolute left-[12%] right-[10%] top-[9%] rounded-2xl bg-white p-6 sm:p-7 ${shadow}`}>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">You&apos;re invited</p>
        <p className="mt-3 text-sm text-muted">Dear the Chens,</p>
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
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="fade-in min-w-0">
            <p className="text-sm text-muted">Wedding planning, simplified</p>
            <h1 className="mt-4 font-serif text-[3.25rem] leading-[1.02] tracking-tight min-[400px]:text-6xl sm:text-7xl">
              One Wedding.<br /><span className="italic text-muted">Every Celebration.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Your website, your guest list and every event, from the welcome dinner to the last dance, in one calm place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href="/signup" size="lg">Start free <ArrowRight className="h-4 w-4" /></ButtonLink>
              {demoEnabled() && <Link href="#demo" className="text-sm underline-offset-4 hover:underline">See a sample wedding</Link>}
            </div>
            <p className="mt-4 text-xs text-muted">Free to start. No card needed.</p>
          </div>

          <HeroPreview />
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Everything for the wedding, nothing you don&apos;t need.</h2>
            <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <Icon className="h-5 w-5 text-ink/70" strokeWidth={1.5} />
                  <h3 className="mt-4 font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_PHOTOS.receptionTable.replace("w=1200", "w=2000")} alt="A long candlelit dinner table" loading="lazy" className="aspect-[16/9] w-full rounded-[28px] object-cover sm:aspect-[21/9]" />
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-sm text-muted">How it works</p>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-ink/15 pt-5">
                <p className="text-xs tabular-nums text-muted">{s.n}</p>
                <h3 className="mt-3 font-serif text-3xl tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {demoEnabled() && (
          <section id="demo" className="scroll-mt-6 border-t border-line bg-white">
            <div className="mx-auto max-w-6xl px-6 py-24">
              <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end">
                <div>
                  <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">See a sample wedding</h2>
                  <p className="mt-3 max-w-sm text-muted">Look around a four-day wedding with private events and different guest lists. Nothing you do there is sent or saved for real.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {DEMO.map((m) => (
                    <Link key={m.mode} href={`/demo/${m.mode}`} prefetch={false}
                      className="group rounded-2xl border border-line p-5 transition hover:border-ink">
                      <span className="block font-medium">{m.label}</span>
                      <span className="mt-1 block text-sm text-muted">{m.sub}</span>
                      <ArrowRight className="mt-6 h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Simple pricing</h2>
              <Link href="/pricing" className="text-sm underline-offset-4 hover:underline">Compare plans</Link>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PLAN_ORDER.map((p) => (
                <div key={p} className={`rounded-2xl border p-6 ${p === "plus" ? "border-ink" : "border-line"}`}>
                  <p className="font-medium">{PLANS[p].name}</p>
                  <p className="mt-4 font-serif text-5xl tracking-tight">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
                  <p className="mt-1 text-xs text-muted">{PLANS[p].billing}</p>
                  <p className="mt-4 text-sm text-muted">{PLANS[p].tagline}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-[28px] bg-ink px-8 py-16 text-center text-ivory sm:px-16">
            <h2 className="font-serif text-4xl tracking-tight sm:text-6xl">Start planning today.</h2>
            <p className="mx-auto mt-4 max-w-md text-ivory/70">Set up your wedding in a few minutes. Your guests will thank you.</p>
            <Link href="/signup" className="mt-8 inline-flex h-12 items-center rounded-full bg-ivory px-7 text-[15px] font-medium text-ink transition hover:bg-white">Start free</Link>
            <p className="mt-6 text-sm text-ivory/60">
              Planning for clients? <Link href="/beta" className="underline underline-offset-2 hover:text-ivory">Join the beta</Link>.{" "}
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
