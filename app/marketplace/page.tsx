import Link from "next/link";
import { Search } from "lucide-react";
import { publishedListings } from "@/lib/listings";
import { inDemo } from "@/lib/demo";
import { cn } from "@/lib/format";
import { CATEGORIES, TIER_RANK, TRADITION_LABELS, VENDOR_TAGS } from "@/lib/marketplace";
import { ButtonLink, Empty, Input, Select } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/market/listing-card";

export const metadata = { title: "Wedding vendors", description: "Vendors who know Muslim and multicultural weddings." };

type SP = { q?: string; category?: string; city?: string; tradition?: string; tag?: string };

export default async function Marketplace({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const demo = await inDemo();
  const all = await publishedListings({ includeDemo: demo });
  const q = (sp.q ?? "").trim().toLowerCase();
  const results = all.filter((l) =>
    (!q || [l.name, l.tagline, l.description, l.category, l.city].join(" ").toLowerCase().includes(q)) &&
    (!sp.category || l.category === sp.category) &&
    (!sp.city || l.city === sp.city) &&
    (!sp.tradition || l.traditions.includes(sp.tradition)) &&
    (!sp.tag || l.tags.includes(sp.tag)))
    // Paid placement first, then quality.
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.rating * Math.log(b.reviewCount + 2) - a.rating * Math.log(a.reviewCount + 2));
  const spotlight = all.filter((l) => l.tier === "spotlight");
  const filtered = !!(q || sp.category || sp.city || sp.tradition || sp.tag);
  const cities = [...new Set(all.map((l) => l.city))].sort();
  const cats = CATEGORIES.filter((c) => all.some((l) => l.category === c));
  const href = (p: Partial<SP>) => `/marketplace?${new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="jali-bg border-b border-line">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-6">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Vendor marketplace</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight sm:text-6xl">Vendors who already know your traditions</h1>
          <form action="/marketplace" className="mt-6 grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input name="q" defaultValue={sp.q} placeholder="Henna artist, halal catering, female photographer…" className="h-11 pl-9" />
            </div>
            <Select name="category" defaultValue={sp.category ?? ""} className="h-11"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
            <Select name="city" defaultValue={sp.city ?? ""} className="h-11"><option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}</Select>
            <button className="h-11 rounded-full bg-ink px-6 text-sm text-ivory">Search</button>
            {sp.tradition && <input type="hidden" name="tradition" value={sp.tradition} />}
            {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
          </form>
          <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {Object.entries(TRADITION_LABELS).map(([k, v]) => (
              <Link key={k} href={href({ tradition: sp.tradition === k ? "" : k })} className={cn("rounded-full border px-3 py-1", sp.tradition === k ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:bg-cream")}>{v}</Link>
            ))}
            <span className="mx-1 text-line">|</span>
            {["halal_certified", "female_team", "alcohol_free", "gender_partitions", "modest_fashion"].map((k) => (
              <Link key={k} href={href({ tag: sp.tag === k ? "" : k })} className={cn("rounded-full border px-3 py-1", sp.tag === k ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:bg-cream")}>{VENDOR_TAGS[k]}</Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {demo && (
          <p className="mb-6 rounded-2xl bg-gold-soft/50 px-4 py-3 text-sm">You&apos;re exploring the demo, so sample vendors are shown alongside real ones. <Link href="/demo/exit" className="underline">Exit the demo</Link> to see the live marketplace.</p>
        )}
        {all.length === 0 && (
          <section className="mb-12 rounded-3xl border border-line bg-white p-8 text-center sm:p-12">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Founding vendors</p>
            <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl">The marketplace is opening. Be one of the first vendors couples find.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">We&apos;re inviting caterers, photographers, henna artists, officiants, venues and designers who know Muslim and multicultural weddings. Listing is free.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/for-vendors">List your business</ButtonLink>
              <ButtonLink href="/demo/marketplace" variant="outline" prefetch={false}>See a sample marketplace</ButtonLink>
            </div>
          </section>
        )}
        {all.length > 0 && !filtered && spotlight.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between"><h2 className="font-serif text-3xl">In the spotlight</h2><span className="text-xs text-muted">Sponsored</span></div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{spotlight.map((l) => <ListingCard key={l.id} l={l} />)}</div>
          </section>
        )}
        {all.length > 0 && <><div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl">{filtered ? `${results.length} ${results.length === 1 ? "vendor" : "vendors"}` : "All vendors"}</h2>
          {filtered && <Link href="/marketplace" className="text-sm text-muted underline">Clear filters</Link>}
        </div>
        {results.length === 0 ? <Empty title="No vendors match yet">Try another city or category.</Empty> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{results.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        )}</>}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 rounded-3xl bg-cream/60 p-8 md:flex-row md:items-center">
          <div><p className="font-serif text-3xl">Run a wedding business?</p><p className="mt-1 text-sm text-muted">Listing is free. Featured and Spotlight placements put you at the top.</p></div>
          <ButtonLink href="/for-vendors">List your business</ButtonLink>
        </div>
      </main>
    </div>
  );
}
