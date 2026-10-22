import Link from "next/link";
import { Check } from "lucide-react";
import { vendorSignup } from "@/lib/actions/marketplace";
import { LISTING_TIERS } from "@/lib/plans";
import { Card } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { VendorSignupForm } from "@/components/market/vendor-signup";

export const metadata = { title: "List your wedding business" };

export default function ForVendors() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="jali-bg border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">For wedding businesses</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">Get booked for every event of the week</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Couples on Qubool plan multi-day, multi-event celebrations: welcome dinners, henna nights, ceremonies, receptions and more. Show them you know their traditions, from halal menus and tea ceremonies to chuppahs, sofreh spreads and female teams.
            </p>
            <Link href="/founding-vendors" className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft/40 p-4 text-sm hover:bg-gold-soft/60">
              <span><b className="block font-serif text-xl font-normal">The Founding 50</b>The first 50 approved vendors get 12 months of Featured listing free.</span>
              <span className="shrink-0 font-medium underline">Apply</span>
            </Link>
            <ul className="mt-6 space-y-2 text-sm">
              {["Free listing with photos, services and the traditions you know", "Inquiries arrive with the couple's date, events and guest count", "Couples can save you straight into their planning dashboard"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{t}</li>
              ))}
            </ul>
          </div>
          <Card className="p-6">
            <h2 className="font-serif text-3xl">Create your free listing</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Takes two minutes. Publish when you&apos;re ready.</p>
            <VendorSignupForm action={vendorSignup} />
          </Card>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-serif text-4xl">Promotion</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {Object.entries(LISTING_TIERS).map(([k, t]) => (
            <div key={k} className={`rounded-3xl border bg-white p-6 ${k === "featured" ? "border-ink shadow-lg" : "border-line"}`}>
              <p className="font-serif text-3xl">{t.name}</p>
              <p className="mt-3 font-serif text-4xl">{t.price ? `$${t.price}` : "Free"}<span className="text-sm text-muted">{t.price ? " / month" : ""}</span></p>
              <ul className="mt-4 space-y-1.5 text-sm">{t.perks.map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{p}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
