import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Users } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { DEMO_MODES } from "@/components/demo-bar";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">Sign in</ButtonLink>
          <ButtonLink href="/signup" size="sm">Start planning</ButtonLink>
        </nav>
      </header>

      <section className="jali-bg relative">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="fade-in">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">For South Asian Muslim weddings</p>
            <h1 className="mt-5 font-serif text-6xl leading-[0.95] sm:text-7xl">
              One wedding website.<br /><span className="italic text-gold">Every</span> guest, their own invitation.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Plan the Mehndi, Nikkah, Shaadi and Walima in one place. Open the Nikkah to the whole community while keeping the Shaadi and Walima private, so each family sees only the events they&apos;re invited to.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">Create your wedding <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="#demo" size="lg" variant="outline">Try the live demo</ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=1200&q=80" alt="" className="arch-mask aspect-[4/5] w-full object-cover shadow-2xl" />
            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-line bg-white p-4 shadow-xl">
              <p className="text-[10px] uppercase tracking-wider text-muted">Ayesha &amp; Omar</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-sage" /> Nikkah · open to all</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Shaadi · 300 invited</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gold" /> Walima · 250 invited</div>
                <div className="flex items-center gap-2"><EyeOff className="h-3.5 w-3.5 text-rose" /> Mehndi · family only</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-20">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Live demo</p>
          <h2 className="mt-3 font-serif text-5xl">See the same website through five pairs of eyes</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Ayesha &amp; Omar&apos;s wedding has a public Nikkah (600 expected), an invitation-only Shaadi (300) and Walima (250) with different guest lists, and a family-only Mehndi. Choose who you want to be:
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {DEMO_MODES.map((m, i) => (
            <Link key={m.mode} href={`/demo/${m.mode}`} prefetch={false}
              className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream font-serif text-lg">{i + 1}</span>
              <span className="mt-4 font-serif text-2xl leading-tight">{m.label}</span>
              <span className="mt-1 text-xs text-muted">{m.sub}</span>
              <span className="mt-3 text-xs text-muted">
                {["Sees: Nikkah", "Sees: Nikkah", "Sees: Nikkah, Shaadi", "Sees: Mehndi, Nikkah, Shaadi, Walima", "Full dashboard"][i]}
              </span>
              <span className="mt-auto pt-5 text-xs font-medium uppercase tracking-wider text-gold group-hover:underline">Open →</span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Use the &ldquo;Demo&rdquo; switcher at the bottom of any page to change identity at any time.</p>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          {[
            [Lock, "Private stays private", "Invitation-only events are filtered on the server. Uninvited guests never see a locked card, a blurred tile, or even the event's name."],
            [Users, "Families, not just names", "Invite “Mr. and Mrs. Ahmed & Family.” One person replies for everyone, choosing who attends each event."],
            [Eye, "Built for how we celebrate", "Separate seating, salah breaks, halal catering, Islamic dates, Bismillah, and Urdu and Arabic invitation text."],
          ].map(([Icon, t, b]) => {
            const I = Icon as typeof Lock;
            return (
              <div key={t as string}>
                <I className="h-5 w-5 text-gold" />
                <h3 className="mt-3 font-serif text-2xl">{t as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b as string}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
