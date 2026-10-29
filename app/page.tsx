import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Globe, LayoutDashboard, Mail, MailOpen, PiggyBank, Store, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { TwoViews } from "@/components/landing/two-views";
import { PlanningHighlight } from "@/components/landing/planning";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const FEATURES = [
  { icon: Mail, title: "Invitations & RSVPs", body: "Each household gets its own link, sees only its events, and replies in a tap." },
  { icon: CalendarDays, title: "Every event", body: "Dinners, ceremonies, brunches. All in one." },
  { icon: Users, title: "Plan together", body: "Bring in family or a planner." },
  { icon: PiggyBank, title: "Budget", body: "Every cost, every event." },
  { icon: Globe, title: "Your website", body: "Your photos, colors and words." },
  { icon: Store, title: "Vendors", body: "Find, message and book them here." },
];

const STEPS = [
  { title: "Set up your events", body: "Add each celebration with its date, venue and hosts." },
  { title: "Plan the details", body: "Budget, checklist, vendors, design studio and outfits." },
  { title: "Invite your guests", body: "Choose who's invited to what. Send by email or text." },
  { title: "Share and celebrate", body: "Replies and headcounts for every event, as they arrive." },
];

const DEMO = [
  { mode: "admin", icon: LayoutDashboard, title: "Couple's dashboard", body: "The wedding admin: events, guests, budget, design studio and outfits." },
  { mode: "all", icon: MailOpen, title: "Guest's invitation", body: "What a guest opens: their own invitation, events and RSVP." },
  { mode: "vendor", icon: Store, title: "Vendor portal", body: "How vendors manage their listing and inquiries." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ivory">
      {/* Warm hero band: header, promise, and the product */}
      <div className="relative overflow-hidden bg-[#f3ebe1]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_60%_at_10%_0%,#ead6cb_0%,transparent_70%),radial-gradient(45%_55%_at_95%_100%,#e2d7cb_0%,transparent_70%)]" />
        <div className="relative">
          <SiteHeader />
          <section className="mx-auto max-w-6xl px-6 pb-14 pt-4">
            <div className="fade-in min-w-0 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.4em] text-gold">One Wedding. Every Celebration.</p>
              <h1 className="mt-4 font-serif text-[3.2rem] leading-[1.02] tracking-tight min-[400px]:text-6xl sm:text-7xl">
                Every guest, <span className="italic text-brown">their own invitation.</span>
              </h1>
              <p className="mt-5 text-xl text-ink/80">Choose who&apos;s invited to each event. They see only theirs, and RSVP in a tap.</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink href="/beta" size="lg">Request Early Access <ArrowRight className="h-4 w-4" /></ButtonLink>
                {demoEnabled() && <Link href="#demo" className="text-[15px] font-medium underline-offset-4 hover:underline">Try the demo</Link>}
                <span className="flex items-center gap-1.5 text-sm text-ink/70"><Check className="h-4 w-4 text-sage" /> Free during the beta</span>
              </div>
            </div>
            <div className="mt-10 min-w-0"><TwoViews /></div>
          </section>
        </div>
      </div>

      <main>
        <section className="bg-[#efe6dc]">
          <div className="mx-auto grid max-w-6xl gap-3 px-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-center gap-4 rounded-2xl bg-ivory p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink"><Icon className="h-5 w-5 text-blush" strokeWidth={1.5} /></span>
                <div><h3 className="text-lg font-medium leading-tight">{title}</h3><p className="text-[15px] text-ink/70">{body}</p></div>
              </div>
            ))}
          </div>
        </section>

        <PlanningHighlight />

        <section className="bg-olive text-ivory">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">How it works</h2>
            <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((st, i) => (
                <li key={st.title} className="border-t border-ivory/25 pt-5">
                  <span className="font-serif text-5xl italic text-blush">{i + 1}</span>
                  <h3 className="mt-3 font-serif text-2xl leading-tight">{st.title}</h3>
                  <p className="mt-2 text-[15px] text-ivory/75">{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {demoEnabled() && (
          <section id="demo" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Try the live demo</h2>
              <p className="text-lg text-ink/70">A sample wedding. No sign-up needed.</p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {DEMO.map(({ mode, icon: Icon, title, body }) => (
                <Link key={mode} href={`/demo/${mode}`} prefetch={false}
                  className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-[0_20px_50px_-30px_rgba(59,43,32,0.4)]">
                  <Icon className="h-7 w-7 text-ink" strokeWidth={1.3} />
                  <h3 className="mt-4 font-serif text-2xl">{title}</h3>
                  <p className="mt-1 flex-1 text-[15px] text-ink/70">{body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em]">Open demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="bg-[#efe6dc]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">Pricing</h2>
              <p className="text-lg text-ink/70">Free during the beta. <Link href="/pricing" className="font-medium text-ink underline-offset-4 hover:underline">Compare plans</Link></p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {PLAN_ORDER.map((p) => (
                <div key={p} className={`flex flex-col rounded-2xl p-6 ${p === "plus" ? "bg-ink text-ivory" : "bg-ivory"}`}>
                  <p className="text-lg font-medium">{PLANS[p].name}</p>
                  <p className="mt-2 font-serif text-5xl tracking-tight">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
                  <p className={`mt-1 text-sm ${p === "plus" ? "text-ivory/60" : "text-ink/60"}`}>{PLANS[p].billing}</p>
                  <ul className="mt-5 space-y-1.5 text-[15px]">
                    {PLANS[p].highlights.slice(1, 4).map((h) => <li key={h} className="flex gap-2"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p === "plus" ? "text-blush" : "text-sage"}`} />{h}</li>)}
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
