import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { TwoViews } from "@/components/landing/two-views";
import { PlanningHighlight } from "@/components/landing/planning";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const STEPS = [
  { title: "Add your events", body: "Each celebration, with its date and venue." },
  { title: "Plan the details", body: "Budget, checklist, vendors, design and outfits." },
  { title: "Invite your guests", body: "Pick who's invited to what. Send by email or text." },
  { title: "Watch replies arrive", body: "Headcounts for every event, as guests RSVP." },
];

const DEMO = [
  { mode: "admin", title: "Couple's dashboard", body: "Plan the wedding" },
  { mode: "all", title: "Guest's invitation", body: "See what guests get" },
  { mode: "vendor", title: "Vendor portal", body: "Manage a listing" },
];

/** One heading style for every section, centered, with an optional short line under it. */
function Heading({ title, sub }: { title: React.ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h2>
      {sub && <p className="mt-3 text-lg text-ink/70">{sub}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-ivory">
      <div className="bg-[#f3ebe1]">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-8">
          <div className="fade-in mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-[3.2rem] leading-[1.02] tracking-tight min-[400px]:text-6xl sm:text-7xl">
              Every guest, <span className="italic text-brown">their own invitation.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-xl text-ink/75">Plan every event in one place. Each guest sees only the events they&apos;re invited to.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <ButtonLink href="/beta" size="lg">Request Early Access <ArrowRight className="h-4 w-4" /></ButtonLink>
              {demoEnabled() && <Link href="#demo" className="text-[15px] font-medium underline-offset-4 hover:underline">Try the demo</Link>}
            </div>
            <p className="mt-4 text-sm text-ink/60">Free during the beta</p>
          </div>
          <div className="mt-14 min-w-0"><TwoViews /></div>
        </section>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24">
          <Heading title="How it works" />
          <ol className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((st, i) => (
              <li key={st.title} className="text-center">
                <span className="font-serif text-5xl italic text-gold">{i + 1}</span>
                <h3 className="mt-3 font-serif text-2xl">{st.title}</h3>
                <p className="mt-2 text-[15px] text-ink/70">{st.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <PlanningHighlight />

        {demoEnabled() && (
          <section id="demo" className="mx-auto max-w-5xl scroll-mt-6 px-6 py-24">
            <Heading title="Try the live demo" sub="A sample wedding. No sign-up needed." />
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {DEMO.map(({ mode, title, body }) => (
                <a key={mode} href={`/demo/${mode}`}
                  className="group rounded-2xl border border-line bg-white p-6 text-center transition hover:border-ink/30">
                  <h3 className="font-serif text-2xl">{title}</h3>
                  <p className="mt-1 text-[15px] text-ink/70">{body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="bg-[#efe6dc]">
          <div className="mx-auto max-w-5xl px-6 py-24">
            <Heading title="Pricing" sub="One payment per wedding. Free during the beta." />
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {PLAN_ORDER.map((p) => (
                <div key={p} className={`rounded-2xl p-7 text-center ${p === "plus" ? "bg-ink text-ivory" : "bg-ivory"}`}>
                  <p className="text-lg font-medium">{PLANS[p].name}</p>
                  <p className="mt-2 font-serif text-5xl tracking-tight">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
                  <p className={`mt-3 text-[15px] ${p === "plus" ? "text-ivory/75" : "text-ink/70"}`}>{PLANS[p].maxEvents === Infinity ? "Unlimited events and guests" : `${PLANS[p].maxEvents} events · ${PLANS[p].maxGuests} guests`}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center"><Link href="/pricing" className="font-medium underline underline-offset-4">Compare plans</Link></p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
