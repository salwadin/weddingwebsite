import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LayoutGrid, Lock, Shirt, Store, Users } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { DEMO_MODES } from "@/components/demo-bar";
import { demoEnabled } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/site-header";
import { TRADITIONS } from "@/lib/format";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

const FEATURES = [
  { icon: Lock, title: "Layered privacy", body: "Open the Nikah to your whole community, keep the reception invitation-only, and make the henna night family-only. Each guest sees only their own events, with no locked cards or awkward “not invited” messages." },
  { icon: Users, title: "Families, not just names", body: "Invite “The Ahmed Family.” One person replies for everyone and chooses who attends each event, with meals, plus-ones and dietary needs." },
  { icon: Shirt, title: "Outfit manager", body: "Every look for every event: the couple, parents and bridal party. Track designers, fittings, pieces, deadlines and payments, and share a color palette with guests." },
  { icon: LayoutGrid, title: "Design studio", body: "Moodboards for each event and drag-and-drop floor plans for stages, prayer rooms, separate sections and tables, all checked against your RSVP count." },
  { icon: Store, title: "Vendor marketplace", body: "Find halal caterers, female photographers, henna artists, officiants and modest bridal designers who already know your traditions." },
  { icon: Eye, title: "Built for how families plan", body: "Parents, siblings and planners get their own roles. Budgets are split by family, and every RSVP and change is logged." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="jali-bg relative">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="fade-in">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">For Muslim & multicultural weddings</p>
            <h1 className="mt-5 font-serif text-6xl leading-[0.95] sm:text-7xl">
              One wedding.<br />Every celebration.<br /><span className="italic text-gold">Every</span> guest, their own invitation.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Plan a wedding that spans many days and many layers: the Nikah, henna night, reception and Walima, with guest lists, outfits, floor plans and vendors in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">Start free <ArrowRight className="h-4 w-4" /></ButtonLink>
              {demoEnabled() && <ButtonLink href="#demo" size="lg" variant="outline">Try the live demo</ButtonLink>}
            </div>
            <p className="mt-4 text-xs text-muted">Every feature free for 14 days. No card required.</p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=1200&q=80" alt="" className="arch-mask aspect-[4/5] w-full object-cover shadow-2xl" />
            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-line bg-white p-4 shadow-xl">
              <p className="text-[10px] uppercase tracking-wider text-muted">One website, four layers</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-sage" /> Nikah · open to all</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Reception · 300 invited</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Walima · 250 invited</div>
                <div className="flex items-center gap-2"><EyeOff className="h-3.5 w-3.5 text-rose" /> Henna night · family only</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 py-5 text-sm text-muted">
          <span className="text-xs uppercase tracking-[0.2em] text-gold">Ready for</span>
          {TRADITIONS.filter((t) => t.value !== "custom").map((t) => <span key={t.value}>{t.label} weddings</span>)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Everything in one place</p>
          <h2 className="mt-3 font-serif text-5xl">Planning for weddings with layers</h2>
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

      {demoEnabled() && (
      <section id="demo" className="scroll-mt-6 bg-cream/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Live demo</p>
            <h2 className="mt-3 font-serif text-5xl">See one website through different eyes</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              Ayesha &amp; Omar&apos;s four-day wedding has a public Nikah, an invitation-only Shaadi and Walima with different guest lists, and a family-only Mehndi. Choose who to be:
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

      <section className="border-t border-line bg-ink text-ivory">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
          <div>
            <p className="font-serif text-4xl">Are you a wedding vendor?</p>
            <p className="mt-2 max-w-xl text-sm text-ivory/70">List your business for free and reach couples planning multi-day Muslim and multicultural weddings. Featured and Spotlight placements put you in front of more of them.</p>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/marketplace" variant="secondary">Browse vendors</ButtonLink>
            <ButtonLink href="/for-vendors" className="bg-gold text-white hover:bg-gold/90">List your business</ButtonLink>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-muted"><Logo className="text-lg" /><p className="mt-2">One wedding, every celebration.</p></footer>
    </div>
  );
}
